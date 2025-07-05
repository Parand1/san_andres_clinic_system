const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener detalles de historia clínica por atencion_id
router.get('/:atencion_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { atencion_id } = req.params;
    const details = await pool.query(`
      SELECT
        h.id, h.atencion_id, h.enfermedad_actual, h.revision_sistemas, h.examen_fisico, h.plan_diagnostico_terapeutico,
        h.created_by_professional_id, h.updated_by_professional_id, h.updated_at,
        cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido,
        ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido
      FROM historia_clinica_detalles h
      LEFT JOIN profesionales cb ON h.created_by_professional_id = cb.id
      LEFT JOIN profesionales ub ON h.updated_by_professional_id = ub.id
      WHERE h.atencion_id = $1
    `, [atencion_id]);

    if (details.rows.length === 0) {
      return res.status(404).json({ msg: 'Detalles de historia clínica no encontrados para esta atención.' });
    }
    res.json(details.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para crear o actualizar detalles de historia clínica
router.post('/:atencion_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  const { atencion_id } = req.params;
  const { enfermedad_actual, revision_sistemas, examen_fisico, plan_diagnostico_terapeutico } = req.body;
  const professionalId = req.user.id;

  if (!atencion_id) {
    return res.status(400).json({ msg: 'ID de atención es requerido.' });
  }

  try {
    // Verificar si ya existen detalles para esta atención
    const existingDetails = await pool.query('SELECT id FROM historia_clinica_detalles WHERE atencion_id = $1', [atencion_id]);

    let result;
    if (existingDetails.rows.length > 0) {
      // Si existen, actualizar
      result = await pool.query(
        `UPDATE historia_clinica_detalles 
         SET enfermedad_actual = $1, revision_sistemas = $2, examen_fisico = $3, plan_diagnostico_terapeutico = $4, updated_by_professional_id = $5, updated_at = CURRENT_TIMESTAMP
         WHERE atencion_id = $6 RETURNING *`,
        [enfermedad_actual, revision_sistemas, examen_fisico, plan_diagnostico_terapeutico, professionalId, atencion_id]
      );
      res.json({ msg: 'Detalles de historia clínica actualizados exitosamente', details: result.rows[0] });
    } else {
      // Si no existen, crear
      result = await pool.query(
        `INSERT INTO historia_clinica_detalles (atencion_id, enfermedad_actual, revision_sistemas, examen_fisico, plan_diagnostico_terapeutico, created_by_professional_id, updated_by_professional_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [atencion_id, enfermedad_actual, revision_sistemas, examen_fisico, plan_diagnostico_terapeutico, professionalId, professionalId]
      );
      res.status(201).json({ msg: 'Detalles de historia clínica registrados exitosamente', details: result.rows[0] });
    }
  } catch (err) {
    console.error('Error al guardar detalles de historia clínica:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para actualizar detalles de historia clínica
router.put('/:atencion_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { atencion_id } = req.params;
    const { enfermedad_actual, revision_sistemas, examen_fisico, plan_diagnostico_terapeutico } = req.body;
    const professionalId = req.user.id;

    // Verificar si el profesional autenticado es el creador de la atención o un admin
    const attentionCreator = await pool.query('SELECT created_by_professional_id FROM atenciones WHERE id = $1', [atencion_id]);
    if (attentionCreator.rows.length === 0) {
      return res.status(404).json({ msg: 'Atención no encontrada.' });
    }
    if (req.user.rol !== 'admin' && attentionCreator.rows[0].created_by_professional_id !== professionalId) {
      return res.status(403).json({ msg: 'Acceso denegado: Solo el creador de la atención o un administrador pueden modificar sus detalles.' });
    }

    let query = 'UPDATE historia_clinica_detalles SET ';
    const values = [];
    let paramIndex = 1;
    const updates = [];

    if (enfermedad_actual !== undefined) { updates.push(`enfermedad_actual = $${paramIndex++}`); values.push(enfermedad_actual); }
    if (revision_sistemas !== undefined) { updates.push(`revision_sistemas = $${paramIndex++}`); values.push(revision_sistemas); }
    if (examen_fisico !== undefined) { updates.push(`examen_fisico = $${paramIndex++}`); values.push(examen_fisico); }
    if (plan_diagnostico_terapeutico !== undefined) { updates.push(`plan_diagnostico_terapeutico = $${paramIndex++}`); values.push(plan_diagnostico_terapeutico); }

    updates.push(`updated_by_professional_id = $${paramIndex++}`); values.push(professionalId);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return res.status(400).json({ msg: 'No hay campos para actualizar.' });
    }

    query += updates.join(', ') + ` WHERE atencion_id = $${paramIndex++} RETURNING *`;
    values.push(atencion_id);

    const updatedDetails = await pool.query(query, values);

    if (updatedDetails.rows.length === 0) {
      return res.status(404).json({ msg: 'Detalles de historia clínica no encontrados para esta atención.' });
    }

    res.json({ msg: 'Detalles de historia clínica actualizados exitosamente', details: updatedDetails.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para eliminar detalles de historia clínica (solo admin)
router.delete('/:atencion_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { atencion_id } = req.params;
    const deletedDetails = await pool.query('DELETE FROM historia_clinica_detalles WHERE atencion_id = $1 RETURNING id', [atencion_id]);

    if (deletedDetails.rows.length === 0) {
      return res.status(404).json({ msg: 'Detalles de historia clínica no encontrados para esta atención.' });
    }

    res.json({ msg: 'Detalles de historia clínica eliminados exitosamente', id: deletedDetails.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
