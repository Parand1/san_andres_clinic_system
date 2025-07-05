const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener todas las especialidades
router.get('/all', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const allSpecialties = await pool.query('SELECT id, nombre FROM especialidades ORDER BY nombre ASC');
    res.json(allSpecialties.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para obtener las especialidades de un profesional específico
router.get('/:professional_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { professional_id } = req.params;
    const professionalSpecialties = await pool.query(`
      SELECT e.id, e.nombre
      FROM profesional_especialidades ps
      JOIN especialidades e ON ps.especialidad_id = e.id
      WHERE ps.profesional_id = $1
      ORDER BY e.nombre ASC
    `, [professional_id]);
    res.json(professionalSpecialties.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para asignar especialidades a un profesional
router.post('/:professional_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { professional_id } = req.params;
  const { specialty_ids } = req.body; // Array de IDs de especialidades

  if (!Array.isArray(specialty_ids)) {
    return res.status(400).json({ msg: 'specialty_ids debe ser un array.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Eliminar especialidades existentes para este profesional
    await client.query('DELETE FROM profesional_especialidades WHERE profesional_id = $1', [professional_id]);

    // Insertar nuevas especialidades
    if (specialty_ids.length > 0) {
      const insertValues = specialty_ids.map(id => `(${professional_id}, ${id})`).join(',');
      await client.query(`INSERT INTO profesional_especialidades (profesional_id, especialidad_id) VALUES ${insertValues}`);
    }

    await client.query('COMMIT');
    res.json({ msg: 'Especialidades asignadas exitosamente.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Error del servidor');
  } finally {
    client.release();
  }
});

module.exports = router;
