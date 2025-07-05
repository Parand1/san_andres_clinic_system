const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener todos los profesionales (solo accesible por admin)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const allProfessionals = await pool.query(`
      SELECT
        p.id, p.cedula, p.nombre, p.apellido, p.email, p.rol, p.fecha_creacion,
        COALESCE(json_agg(json_build_object('id', e.id, 'nombre', e.nombre)) FILTER (WHERE e.id IS NOT NULL), '[]') AS especialidades
      FROM profesionales p
      LEFT JOIN profesional_especialidades ps ON p.id = ps.profesional_id
      LEFT JOIN especialidades e ON ps.especialidad_id = e.id
      GROUP BY p.id
      ORDER BY p.nombre ASC
    `);
    res.json(allProfessionals.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para obtener un profesional por ID (solo accesible por admin)
router.get('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const professional = await pool.query(`
      SELECT
        p.id, p.cedula, p.nombre, p.apellido, p.email, p.rol, p.fecha_creacion,
        COALESCE(json_agg(json_build_object('id', e.id, 'nombre', e.nombre)) FILTER (WHERE e.id IS NOT NULL), '[]') AS especialidades
      FROM profesionales p
      LEFT JOIN profesional_especialidades ps ON p.id = ps.profesional_id
      LEFT JOIN especialidades e ON ps.especialidad_id = e.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);

    if (professional.rows.length === 0) {
      return res.status(404).json({ msg: 'Profesional no encontrado.' });
    }
    res.json(professional.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para actualizar un profesional (solo accesible por admin)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula, nombre, apellido, email, password, rol } = req.body;
    let passwordHash = null;

    // Si se proporciona una nueva contraseña, hashearla
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    let query = 'UPDATE profesionales SET ';
    const values = [];
    let paramIndex = 1;
    const updates = [];

    if (cedula) { updates.push(`cedula = $${paramIndex++}`); values.push(cedula); }
    if (nombre) { updates.push(`nombre = $${paramIndex++}`); values.push(nombre); }
    if (apellido) { updates.push(`apellido = $${paramIndex++}`); values.push(apellido); }
    if (email) { updates.push(`email = $${paramIndex++}`); values.push(email); }
    if (passwordHash) { updates.push(`password_hash = $${paramIndex++}`); values.push(passwordHash); }
    if (rol) { updates.push(`rol = $${paramIndex++}`); values.push(rol); }

    if (updates.length === 0) {
      return res.status(400).json({ msg: 'No hay campos para actualizar.' });
    }

    query += updates.join(', ') + ` WHERE id = $${paramIndex++} RETURNING id, email, rol`;
    values.push(id);

    const updatedProfessional = await pool.query(query, values);

    if (updatedProfessional.rows.length === 0) {
      return res.status(404).json({ msg: 'Profesional no encontrado.' });
    }

    res.json({ msg: 'Profesional actualizado exitosamente', user: updatedProfessional.rows[0] });

  } catch (err) {
    console.error(err.message);
    // Manejar error de unicidad si se intenta actualizar con un email/cedula ya existente
    if (err.code === '23505') {
      return res.status(400).json({ msg: 'La cédula o el email ya están registrados.' });
    }
    res.status(500).send('Error del servidor');
  }
});

// Ruta para eliminar un profesional (solo accesible por admin)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProfessional = await pool.query('DELETE FROM profesionales WHERE id = $1 RETURNING id', [id]);

    if (deletedProfessional.rows.length === 0) {
      return res.status(404).json({ msg: 'Profesional no encontrado.' });
    }

    res.json({ msg: 'Profesional eliminado exitosamente', id: deletedProfessional.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;