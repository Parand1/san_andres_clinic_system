const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// RUTA: GET /api/tarifario - Obtener lista de precios (activos)
// Accesible para todos los usuarios autenticados
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Si es admin o secretaria, quizás quieran ver también los inactivos para reactivarlos.
    // Por ahora devolvemos todos si se pasa ?all=true, sino solo activos.
    const { all } = req.query;
    let query = 'SELECT * FROM tarifario';
    if (!all) {
        query += ' WHERE activo = TRUE';
    }
    query += ' ORDER BY nombre ASC';
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// RUTA: POST /api/tarifario - Crear nuevo servicio
// Accesible para Admin y Secretaria
router.post('/', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    const { nombre, precio, tipo, especialidad_id } = req.body;
    try {
        const newService = await pool.query(
            'INSERT INTO tarifario (nombre, precio, tipo, especialidad_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, precio, tipo, especialidad_id || null]
        );
        res.json(newService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// RUTA: PUT /api/tarifario/:id - Editar servicio
// Accesible para Admin y Secretaria
router.put('/:id', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    const { id } = req.params;
    const { nombre, precio, tipo, especialidad_id } = req.body;
    try {
        const updateService = await pool.query(
            'UPDATE tarifario SET nombre = $1, precio = $2, tipo = $3, especialidad_id = $4 WHERE id = $5 RETURNING *',
            [nombre, precio, tipo, especialidad_id || null, id]
        );
        res.json(updateService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// RUTA: PATCH /api/tarifario/:id/toggle - Activar/Desactivar servicio
// Accesible para Admin y Secretaria
router.patch('/:id/toggle', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    const { id } = req.params;
    try {
        const current = await pool.query('SELECT activo FROM tarifario WHERE id = $1', [id]);
        if (current.rows.length === 0) return res.status(404).json({msg: 'No encontrado'});

        const newState = !current.rows[0].activo;
        const updateService = await pool.query(
            'UPDATE tarifario SET activo = $1 WHERE id = $2 RETURNING *',
            [newState, id]
        );
        res.json(updateService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

module.exports = router;