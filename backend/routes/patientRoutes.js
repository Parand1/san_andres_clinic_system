const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener todos los pacientes (accesible por admin y profesional)
// Ahora incluye funcionalidad de búsqueda por cédula, nombre, apellido o email
router.get('/', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { search } = req.query; // Obtener el parámetro de búsqueda
    let query = 'SELECT p.id, p.cedula, p.nombre, p.apellido, p.fecha_nacimiento, p.genero, p.telefono, p.direccion, p.email, p.fecha_creacion, p.updated_at, \n       cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido, \n       ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido \n       FROM pacientes p\n       LEFT JOIN profesionales cb ON p.created_by_professional_id = cb.id\n       LEFT JOIN profesionales ub ON p.updated_by_professional_id = ub.id';
    const values = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE p.cedula ILIKE $${paramIndex} OR p.nombre ILIKE $${paramIndex} OR p.apellido ILIKE $${paramIndex} OR p.email ILIKE $${paramIndex}`;
      values.push(`%${search}%`);
    }

    query += ' ORDER BY p.fecha_creacion DESC'; // Ordenar por fecha de creación, los más nuevos primero

    const allPatients = await pool.query(query, values);
    res.json(allPatients.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para obtener un paciente por ID (accesible por admin y profesional)
router.get('/:id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await pool.query('SELECT p.id, p.cedula, p.nombre, p.apellido, p.fecha_nacimiento, p.genero, p.telefono, p.direccion, p.email, p.fecha_creacion, p.updated_at, \n       cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido, \n       ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido \n       FROM pacientes p\n       LEFT JOIN profesionales cb ON p.created_by_professional_id = cb.id\n       LEFT JOIN profesionales ub ON p.updated_by_professional_id = ub.id WHERE p.id = $1', [id]);

    if (patient.rows.length === 0) {
      return res.status(404).json({ msg: 'Paciente no encontrado.' });
    }
    res.json(patient.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para crear un nuevo paciente (accesible por admin y profesional)
router.post('/', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  const { cedula, nombre, apellido, fecha_nacimiento, genero, telefono, direccion, email } = req.body;
  const professionalId = req.user.id; // ID del profesional autenticado

  // Validaciones básicas
  if (!cedula || !nombre || !apellido) {
    return res.status(400).json({ msg: 'Cédula, nombre y apellido son campos requeridos.' });
  }

  try {
    // Verificar si el paciente ya existe por cédula o email
    let existingPatient = await pool.query('SELECT * FROM pacientes WHERE cedula = $1 OR email = $2', [cedula, email]);
    if (existingPatient.rows.length > 0) {
      return res.status(400).json({ msg: 'Ya existe un paciente con esa cédula o email.' });
    }

    const newPatient = await pool.query(
      'INSERT INTO pacientes (cedula, nombre, apellido, fecha_nacimiento, genero, telefono, direccion, email, created_by_professional_id, updated_by_professional_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *' ,
      [cedula, nombre, apellido, fecha_nacimiento, genero, telefono, direccion, email, professionalId, professionalId]
    );

    res.status(201).json({ msg: 'Paciente registrado exitosamente', patient: newPatient.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para actualizar un paciente (accesible por admin y profesional)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula, nombre, apellido, fecha_nacimiento, genero, telefono, direccion, email } = req.body;
    const professionalId = req.user.id; // ID del profesional que realiza la actualización

    let query = 'UPDATE pacientes SET ';
    const values = [];
    let paramIndex = 1;
    const updates = [];

    if (cedula) { updates.push(`cedula = $${paramIndex++}`); values.push(cedula); }
    if (nombre) { updates.push(`nombre = $${paramIndex++}`); values.push(nombre); }
    if (apellido) { updates.push(`apellido = $${paramIndex++}`); values.push(apellido); }
    if (fecha_nacimiento) { updates.push(`fecha_nacimiento = $${paramIndex++}`); values.push(fecha_nacimiento); }
    if (genero) { updates.push(`genero = $${paramIndex++}`); values.push(genero); }
    if (telefono) { updates.push(`telefono = $${paramIndex++}`); values.push(telefono); }
    if (direccion) { updates.push(`direccion = $${paramIndex++}`); values.push(direccion); }
    if (email) { updates.push(`email = $${paramIndex++}`); values.push(email); }

    // Actualizar campos de auditoría
    updates.push(`updated_by_professional_id = $${paramIndex++}`); values.push(professionalId);
    updates.push(`updated_at = CURRENT_TIMESTAMP`); // La base de datos actualizará el timestamp

    if (updates.length === 0) {
      return res.status(400).json({ msg: 'No hay campos para actualizar.' });
    }

    query += updates.join(', ') + ` WHERE id = $${paramIndex++} RETURNING *`;
    values.push(id);

    const updatedPatient = await pool.query(query, values);

    if (updatedPatient.rows.length === 0) {
      return res.status(404).json({ msg: 'Paciente no encontrado.' });
    }

    res.json({ msg: 'Paciente actualizado exitosamente', patient: updatedPatient.rows[0] });

  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') { // Manejar error de unicidad
      return res.status(400).json({ msg: 'La cédula o el email ya están registrados para otro paciente.' });
    }
    res.status(500).send('Error del servidor');
  }
});

// Ruta para eliminar un paciente (SOLO ACCESIBLE POR ADMIN)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPatient = await pool.query('DELETE FROM pacientes WHERE id = $1 RETURNING id', [id]);

    if (deletedPatient.rows.length === 0) {
      return res.status(404).json({ msg: 'Paciente no encontrado.' });
    }

    res.json({ msg: 'Paciente eliminado exitosamente', id: deletedPatient.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;