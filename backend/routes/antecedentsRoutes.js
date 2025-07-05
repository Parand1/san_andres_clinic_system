const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener antecedentes médicos por paciente_id
router.get('/:paciente_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const antecedents = await pool.query(`
      SELECT
        a.id, a.paciente_id, a.personales, a.familiares, a.quirurgicos, a.alergicos, a.farmacologicos, a.otros,
        a.created_by_professional_id, a.updated_by_professional_id, a.updated_at,
        cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido,
        ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido
      FROM antecedentes_medicos a
      LEFT JOIN profesionales cb ON a.created_by_professional_id = cb.id
      LEFT JOIN profesionales ub ON a.updated_by_professional_id = ub.id
      WHERE a.paciente_id = $1
    `, [paciente_id]);

    if (antecedents.rows.length === 0) {
      return res.status(404).json({ msg: 'Antecedentes médicos no encontrados para este paciente.' });
    }
    res.json(antecedents.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para crear o actualizar antecedentes médicos
router.post('/:paciente_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  const { paciente_id } = req.params;
  const { personales, familiares, quirurgicos, alergicos, farmacologicos, otros } = req.body;
  const professionalId = req.user.id;

  if (!paciente_id) {
    return res.status(400).json({ msg: 'ID de paciente es requerido.' });
  }

  try {
    // Verificar si ya existen antecedentes para este paciente
    const existingAntecedents = await pool.query('SELECT id FROM antecedentes_medicos WHERE paciente_id = $1', [paciente_id]);

    let result;
    if (existingAntecedents.rows.length > 0) {
      // Si existen, actualizar
      result = await pool.query(
        `UPDATE antecedentes_medicos 
         SET personales = $1, familiares = $2, quirurgicos = $3, alergicos = $4, farmacologicos = $5, otros = $6, updated_by_professional_id = $7, updated_at = CURRENT_TIMESTAMP
         WHERE paciente_id = $8 RETURNING *`,
        [personales, familiares, quirurgicos, alergicos, farmacologicos, otros, professionalId, paciente_id]
      );
      res.json({ msg: 'Antecedentes médicos actualizados exitosamente', antecedents: result.rows[0] });
    } else {
      // Si no existen, crear
      result = await pool.query(
        `INSERT INTO antecedentes_medicos (paciente_id, personales, familiares, quirurgicos, alergicos, farmacologicos, otros, created_by_professional_id, updated_by_professional_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [paciente_id, personales, familiares, quirurgicos, alergicos, farmacologicos, otros, professionalId, professionalId]
      );
      res.status(201).json({ msg: 'Antecedentes médicos registrados exitosamente', antecedents: result.rows[0] });
    }
  } catch (err) {
    console.error('Error al guardar antecedentes médicos:', err.message);
    res.status(500).send('Error del servidor');
  }
});



// Ruta para eliminar antecedentes médicos (solo admin)
router.delete('/:paciente_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const deletedAntecedents = await pool.query('DELETE FROM antecedentes_medicos WHERE paciente_id = $1 RETURNING id', [paciente_id]);

    if (deletedAntecedents.rows.length === 0) {
      return res.status(404).json({ msg: 'Antecedentes médicos no encontrados para este paciente.' });
    }

    res.json({ msg: 'Antecedentes médicos eliminados exitosamente', id: deletedAntecedents.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
