const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener todas las atenciones (accesible por admin y profesional)
// Permite filtrar por paciente_id o profesional_id
router.get('/', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { paciente_id, profesional_id } = req.query;
    let query = `
      SELECT
        a.id, a.paciente_id, a.profesional_id, a.fecha_atencion, a.motivo_consulta, a.notas_generales,
        a.created_by_professional_id, a.updated_by_professional_id, a.updated_at,
        p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
        prof.nombre AS profesional_nombre, prof.apellido AS profesional_apellido,
        cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido,
        ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido
      FROM atenciones a
      JOIN pacientes p ON a.paciente_id = p.id
      JOIN profesionales prof ON a.profesional_id = prof.id
      LEFT JOIN profesionales cb ON a.created_by_professional_id = cb.id
      LEFT JOIN profesionales ub ON a.updated_by_professional_id = ub.id
    `;
    const values = [];
    let whereClauses = [];
    let paramIndex = 1;

    if (paciente_id) {
      whereClauses.push(`a.paciente_id = $${paramIndex++}`);
      values.push(paciente_id);
    }
    if (profesional_id) {
      whereClauses.push(`a.profesional_id = $${paramIndex++}`);
      values.push(profesional_id);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY a.fecha_atencion DESC'; // Ordenar por fecha de atención, las más nuevas primero

    const allAttentions = await pool.query(query, values);
    res.json(allAttentions.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para obtener una atención por ID (accesible por admin y profesional)
router.get('/:id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { id } = req.params;
    const attention = await pool.query(`
      SELECT
        a.id, a.paciente_id, a.profesional_id, a.fecha_atencion, a.motivo_consulta, a.notas_generales,
        a.created_by_professional_id, a.updated_by_professional_id, a.updated_at,
        p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
        prof.nombre AS profesional_nombre, prof.apellido AS profesional_apellido,
        cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido,
        ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido
      FROM atenciones a
      JOIN pacientes p ON a.paciente_id = p.id
      JOIN profesionales prof ON a.profesional_id = prof.id
      LEFT JOIN profesionales cb ON a.created_by_professional_id = cb.id
      LEFT JOIN profesionales ub ON a.updated_by_professional_id = ub.id
      WHERE a.id = $1
    `, [id]);

    if (attention.rows.length === 0) {
      return res.status(404).json({ msg: 'Atención no encontrada.' });
    }
    res.json(attention.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para crear una nueva atención (accesible por admin y profesional)
router.post('/', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  const { paciente_id, motivo_consulta, notas_generales } = req.body;
  const professionalId = req.user.id; // ID del profesional autenticado

  // Validaciones básicas
  if (!paciente_id || !motivo_consulta) {
    return res.status(400).json({ msg: 'ID de paciente y motivo de consulta son campos requeridos.' });
  }

  try {
    // Verificar que el paciente exista
    const patientExists = await pool.query('SELECT id FROM pacientes WHERE id = $1', [paciente_id]);
    if (patientExists.rows.length === 0) {
      return res.status(404).json({ msg: 'Paciente no encontrado.' });
    }

    const newAttention = await pool.query(
      'INSERT INTO atenciones (paciente_id, profesional_id, motivo_consulta, notas_generales, created_by_professional_id, updated_by_professional_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *' ,
      [paciente_id, professionalId, motivo_consulta, notas_generales, professionalId, professionalId]
    );

    res.status(201).json({ msg: 'Atención registrada exitosamente', attention: newAttention.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para actualizar una atención (solo si el profesional autenticado es el creador)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_consulta, notas_generales } = req.body;
    const professionalId = req.user.id; // ID del profesional que intenta actualizar

    // Primero, verificar si la atención existe y si el profesional autenticado es el creador
    const existingAttention = await pool.query('SELECT created_by_professional_id FROM atenciones WHERE id = $1', [id]);

    if (existingAttention.rows.length === 0) {
      return res.status(404).json({ msg: 'Atención no encontrada.' });
    }

    // Si no es admin y no es el creador, denegar acceso
    if (req.user.rol !== 'admin' && existingAttention.rows[0].created_by_professional_id !== professionalId) {
      return res.status(403).json({ msg: 'Acceso denegado: Solo el creador de la atención o un administrador pueden modificarla.' });
    }

    let query = 'UPDATE atenciones SET ';
    const values = [];
    let paramIndex = 1;
    const updates = [];

    if (motivo_consulta) { updates.push(`motivo_consulta = $${paramIndex++}`); values.push(motivo_consulta); }
    if (notas_generales) { updates.push(`notas_generales = $${paramIndex++}`); values.push(notas_generales); }

    // Actualizar campos de auditoría
    updates.push(`updated_by_professional_id = $${paramIndex++}`); values.push(professionalId);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return res.status(400).json({ msg: 'No hay campos para actualizar.' });
    }

    query += updates.join(', ') + ` WHERE id = $${paramIndex++} RETURNING *`;
    values.push(id);

    const updatedAttention = await pool.query(query, values);

    res.json({ msg: 'Atención actualizada exitosamente', attention: updatedAttention.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para eliminar una atención (SOLO ACCESIBLE POR ADMIN)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAttention = await pool.query('DELETE FROM atenciones WHERE id = $1 RETURNING id', [id]);

    if (deletedAttention.rows.length === 0) {
      return res.status(404).json({ msg: 'Atención no encontrada.' });
    }

    res.json({ msg: 'Atención eliminada exitosamente', id: deletedAttention.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
