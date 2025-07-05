const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para buscar códigos CIE-10 (accesible por admin y profesional)
router.get('/', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { search } = req.query; // Término de búsqueda
    let query = 'SELECT id, code, description FROM cie10_catalog';
    const values = [];

    if (search) {
      query += ` WHERE code ILIKE $1 OR description ILIKE $1`;
      values.push(`%${search}%`);
    }

    query += ' ORDER BY code ASC LIMIT 50'; // Limitar resultados para eficiencia

    const cie10Codes = await pool.query(query, values);
    res.json(cie10Codes.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para obtener un código CIE-10 por ID (opcional, si se necesita)
router.get('/:id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { id } = req.params;
    const cie10Code = await pool.query('SELECT id, code, description FROM cie10_catalog WHERE id = $1', [id]);

    if (cie10Code.rows.length === 0) {
      return res.status(404).json({ msg: 'Código CIE-10 no encontrado.' });
    }
    res.json(cie10Code.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
