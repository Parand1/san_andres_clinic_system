const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Importamos el pool de conexión

// Cargar variables de entorno
require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET || 'supersecretjwtkey'; // Usar una clave secreta de entorno

// Ruta de registro de profesionales (solo para administradores)
router.post('/register', async (req, res) => {
  const { cedula, nombre, apellido, email, password, especialidad, rol } = req.body;

  // Validaciones básicas
  if (!cedula || !nombre || !apellido || !email || !password) {
    return res.status(400).json({ msg: 'Por favor, ingrese todos los campos requeridos.' });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ msg: 'Formato de email inválido.' });
  }

  try {
    // Verificar si el profesional ya existe
    let user = await pool.query('SELECT * FROM profesionales WHERE email = $1 OR cedula = $2', [email, cedula]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'Ya existe un profesional con esa cédula o email.' });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar el nuevo profesional
    const newUser = await pool.query(
      'INSERT INTO profesionales (cedula, nombre, apellido, email, password_hash, rol) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, rol',
      [cedula, nombre, apellido, email, passwordHash, rol || 'profesional'] // Por defecto es 'profesional'
    );

    // Generar JWT (opcional en registro, pero útil si el admin registra y quiere loguear al nuevo)
    const token = jwt.sign(
      { id: newUser.rows[0].id, rol: newUser.rows[0].rol },
      jwtSecret,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      msg: 'Profesional registrado exitosamente',
      token,
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        rol: newUser.rows[0].rol,
      },
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta de Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validaciones básicas
  if (!email || !password) {
    return res.status(400).json({ msg: 'Por favor, ingrese email y contraseña.' });
  }

  try {
    // Verificar si el usuario existe
    const userResult = await pool.query('SELECT * FROM profesionales WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ msg: 'Credenciales inválidas.' });
    }
    const user = userResult.rows[0];

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Credenciales inválidas.' });
    }

    // Obtener especialidades del profesional
    const specialtiesResult = await pool.query(
      `SELECT e.nombre FROM profesional_especialidades pe
       JOIN especialidades e ON pe.especialidad_id = e.id
       WHERE pe.profesional_id = $1`,
      [user.id]
    );
    const specialties = specialtiesResult.rows.map(row => row.nombre);

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, rol: user.rol, especialidades: specialties }, // Incluir especialidades en el token
      jwtSecret,
      { expiresIn: '1h' } // Token expira en 1 hora
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
        especialidades: specialties, // Incluir especialidades en la respuesta
      },
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
