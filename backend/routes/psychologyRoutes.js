const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener una evaluación de psicología por atencion_id
router.get('/:atencion_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { atencion_id } = req.params;
    const evaluation = await pool.query(`
      SELECT
        p.id, p.atencion_id, p.motivo_consulta_psicologia, p.historia_psicologica, p.evaluacion_mental, p.impresion_diagnostica, p.plan_intervencion,
        p.created_by_professional_id, p.updated_by_professional_id, p.updated_at,
        cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido,
        ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido
      FROM psicologia_evaluaciones p
      LEFT JOIN profesionales cb ON p.created_by_professional_id = cb.id
      LEFT JOIN profesionales ub ON p.updated_by_professional_id = ub.id
      WHERE p.atencion_id = $1
    `, [atencion_id]);

    if (evaluation.rows.length === 0) {
      return res.status(404).json({ msg: 'Evaluación de psicología no encontrada para esta atención.' });
    }
    res.json(evaluation.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para crear una nueva evaluación de psicología
router.post('/', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  const { atencion_id, motivo_consulta_psicologia, historia_psicologica, evaluacion_mental, impresion_diagnostica, plan_intervencion } = req.body;
  const professionalId = req.user.id;

  if (!atencion_id) {
    return res.status(400).json({ msg: 'ID de atención es requerido.' });
  }

  try {
    // Verificar que la atención exista
    const attentionExists = await pool.query('SELECT id FROM atenciones WHERE id = $1', [atencion_id]);
    if (attentionExists.rows.length === 0) {
      return res.status(404).json({ msg: 'Atención no encontrada.' });
    }

    const newEvaluation = await pool.query(
      'INSERT INTO psicologia_evaluaciones (atencion_id, motivo_consulta_psicologia, historia_psicologica, evaluacion_mental, impresion_diagnostica, plan_intervencion, created_by_professional_id, updated_by_professional_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *' ,
      [atencion_id, motivo_consulta_psicologia, historia_psicologica, evaluacion_mental, impresion_diagnostica, plan_intervencion, professionalId, professionalId]
    );

    res.status(201).json({ msg: 'Evaluación de psicología registrada exitosamente', evaluation: newEvaluation.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para actualizar una evaluación de psicología
router.put('/:atencion_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { atencion_id } = req.params;
    const { motivo_consulta_psicologia, historia_psicologica, evaluacion_mental, impresion_diagnostica, plan_intervencion } = req.body;
    const professionalId = req.user.id;

    // Verificar si el profesional autenticado es el creador de la atención o un admin
    const attentionCreator = await pool.query('SELECT created_by_professional_id FROM atenciones WHERE id = $1', [atencion_id]);
    if (attentionCreator.rows.length === 0) {
      return res.status(404).json({ msg: 'Atención no encontrada.' });
    }
    if (req.user.rol !== 'admin' && attentionCreator.rows[0].created_by_professional_id !== professionalId) {
      return res.status(403).json({ msg: 'Acceso denegado: Solo el creador de la atención o un administrador pueden modificar su evaluación.' });
    }

    let query = 'UPDATE psicologia_evaluaciones SET ';
    const values = [];
    let paramIndex = 1;
    const updates = [];

    if (motivo_consulta_psicologia !== undefined) { updates.push(`motivo_consulta_psicologia = $${paramIndex++}`); values.push(motivo_consulta_psicologia); }
    if (historia_psicologica !== undefined) { updates.push(`historia_psicologica = $${paramIndex++}`); values.push(historia_psicologica); }
    if (evaluacion_mental !== undefined) { updates.push(`evaluacion_mental = $${paramIndex++}`); values.push(evaluacion_mental); }
    if (impresion_diagnostica !== undefined) { updates.push(`impresion_diagnostica = $${paramIndex++}`); values.push(impresion_diagnostica); }
    if (plan_intervencion !== undefined) { updates.push(`plan_intervencion = $${paramIndex++}`); values.push(plan_intervencion); }

    updates.push(`updated_by_professional_id = $${paramIndex++}`); values.push(professionalId);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return res.status(400).json({ msg: 'No hay campos para actualizar.' });
    }

    query += updates.join(', ') + ` WHERE atencion_id = $${paramIndex++} RETURNING *`;
    values.push(atencion_id);

    const updatedEvaluation = await pool.query(query, values);

    if (updatedEvaluation.rows.length === 0) {
      return res.status(404).json({ msg: 'Evaluación de psicología no encontrada para esta atención.' });
    }

    res.json({ msg: 'Evaluación de psicología actualizada exitosamente', evaluation: updatedEvaluation.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para eliminar una evaluación de psicología (solo admin)
router.delete('/:atencion_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { atencion_id } = req.params;
    const deletedEvaluation = await pool.query('DELETE FROM psicologia_evaluaciones WHERE atencion_id = $1 RETURNING id', [atencion_id]);

    if (deletedEvaluation.rows.length === 0) {
      return res.status(404).json({ msg: 'Evaluación de psicología no encontrada para esta atención.' });
    }

    res.json({ msg: 'Evaluación de psicología eliminada exitosamente', id: deletedEvaluation.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
