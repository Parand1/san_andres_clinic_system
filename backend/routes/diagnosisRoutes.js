const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener todos los diagnósticos (accesible por admin y profesional)
// Permite filtrar por atencion_id
router.get('/', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { atencion_id } = req.query;
    let query = `
      SELECT
        d.id, d.atencion_id, d.cie10_id, d.tipo_diagnostico, d.created_by_professional_id, d.updated_by_professional_id, d.updated_at,
        c.code AS cie10_code, c.description AS cie10_description,
        cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido,
        ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido
      FROM diagnosticos d
      JOIN cie10_catalog c ON d.cie10_id = c.id
      LEFT JOIN profesionales cb ON d.created_by_professional_id = cb.id
      LEFT JOIN profesionales ub ON d.updated_by_professional_id = ub.id
    `;
    const values = [];
    let whereClauses = [];
    let paramIndex = 1;

    if (atencion_id) {
      whereClauses.push(`d.atencion_id = $${paramIndex++}`);
      values.push(atencion_id);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY d.updated_at DESC';

    const allDiagnoses = await pool.query(query, values);
    res.json(allDiagnoses.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para obtener un diagnóstico por ID (accesible por admin y profesional)
router.get('/:id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { id } = req.params;
    const diagnosis = await pool.query(`
      SELECT
        d.id, d.atencion_id, d.cie10_id, d.tipo_diagnostico, d.created_by_professional_id, d.updated_by_professional_id, d.updated_at,
        c.code AS cie10_code, c.description AS cie10_description,
        cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido,
        ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido
      FROM diagnosticos d
      JOIN cie10_catalog c ON d.cie10_id = c.id
      LEFT JOIN profesionales cb ON d.created_by_professional_id = cb.id
      LEFT JOIN profesionales ub ON d.updated_by_professional_id = ub.id
      WHERE d.id = $1
    `, [id]);

    if (diagnosis.rows.length === 0) {
      return res.status(404).json({ msg: 'Diagnóstico no encontrado.' });
    }
    res.json(diagnosis.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para crear o actualizar un diagnóstico para una atención
router.post('/:atencion_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  const { atencion_id } = req.params;
  // El cuerpo ahora puede ser un array de diagnósticos o un solo objeto
  const diagnoses = Array.isArray(req.body) ? req.body : [req.body];
  const professionalId = req.user.id;

  if (!atencion_id) {
    return res.status(400).json({ msg: 'ID de atención es requerido.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Opcional: Eliminar diagnósticos existentes para esta atención para reemplazarlos
    // Esto simplifica la lógica a solo insertar los nuevos diagnósticos
    await client.query('DELETE FROM diagnosticos WHERE atencion_id = $1', [atencion_id]);

    const results = [];
    for (const diag of diagnoses) {
      const { cie10_id, tipo_diagnostico } = diag;
      if (!cie10_id || !tipo_diagnostico) {
        throw new Error('cie10_id y tipo_diagnostico son requeridos para cada diagnóstico.');
      }

      const newDiagnosis = await client.query(
        `INSERT INTO diagnosticos (atencion_id, cie10_id, tipo_diagnostico, created_by_professional_id, updated_by_professional_id) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [atencion_id, cie10_id, tipo_diagnostico, professionalId, professionalId]
      );
      results.push(newDiagnosis.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ msg: 'Diagnósticos guardados exitosamente', diagnoses: results });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al guardar diagnósticos:', err.message);
    res.status(500).send('Error del servidor');
  } finally {
    client.release();
  }
});

// Ruta para actualizar un diagnóstico (solo si el profesional autenticado es el creador o admin)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cie10_id, tipo_diagnostico } = req.body;
    const professionalId = req.user.id;

    const existingDiagnosis = await pool.query('SELECT created_by_professional_id FROM diagnosticos WHERE id = $1', [id]);

    if (existingDiagnosis.rows.length === 0) {
      return res.status(404).json({ msg: 'Diagnóstico no encontrado.' });
    }

    if (req.user.rol !== 'admin' && existingDiagnosis.rows[0].created_by_professional_id !== professionalId) {
      return res.status(403).json({ msg: 'Acceso denegado: Solo el creador del diagnóstico o un administrador pueden modificarlo.' });
    }

    let query = 'UPDATE diagnosticos SET ';
    const values = [];
    let paramIndex = 1;
    const updates = [];

    if (cie10_id) { updates.push(`cie10_id = $${paramIndex++}`); values.push(cie10_id); }
    if (tipo_diagnostico) { updates.push(`tipo_diagnostico = $${paramIndex++}`); values.push(tipo_diagnostico); }

    updates.push(`updated_by_professional_id = $${paramIndex++}`); values.push(professionalId);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return res.status(400).json({ msg: 'No hay campos para actualizar.' });
    }

    query += updates.join(', ') + ` WHERE id = $${paramIndex++} RETURNING *`;
    values.push(id);

    const updatedDiagnosis = await pool.query(query, values);

    res.json({ msg: 'Diagnóstico actualizado exitosamente', diagnosis: updatedDiagnosis.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para eliminar un diagnóstico (SOLO ACCESIBLE POR ADMIN)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDiagnosis = await pool.query('DELETE FROM diagnosticos WHERE id = $1 RETURNING id', [id]);

    if (deletedDiagnosis.rows.length === 0) {
      return res.status(404).json({ msg: 'Diagnóstico no encontrado.' });
    }

    res.json({ msg: 'Diagnóstico eliminado exitosamente', id: deletedDiagnosis.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
