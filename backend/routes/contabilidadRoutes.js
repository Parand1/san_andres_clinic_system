const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Importar la función de auditoría
const audit = async (userId, action, entity, entityId, details = {}) => {
  try {
    await pool.query(
      'INSERT INTO historial_auditoria (usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, entity, entityId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Error en el servicio de auditoría:', err.message);
  }
};

// RUTA: POST /api/contabilidad/caja/apertura - Abrir la caja al inicio del día
// Accesible para secretaria y admin
router.post('/caja/apertura', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
  const { monto_inicial } = req.body;
  const userId = req.user.id;

  if (monto_inicial === undefined || isNaN(parseFloat(monto_inicial))) {
    return res.status(400).json({ msg: 'El monto inicial es requerido y debe ser un número.' });
  }

  try {
    // Opcional: Verificar si ya hay una caja abierta para el día para evitar duplicados

    const transaccion = await pool.query(
      `INSERT INTO transacciones_caja (tipo_transaccion, monto, metodo_pago, descripcion, usuario_id)
       VALUES ('Apertura de Caja', $1, 'Efectivo', 'Fondo de caja inicial', $2) RETURNING id`,
      [monto_inicial, userId]
    );

    await audit(userId, 'Apertura de Caja', 'Contabilidad', transaccion.rows[0].id, { monto: monto_inicial });

    res.status(201).json({ msg: 'Caja abierta exitosamente.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// RUTA: POST /api/contabilidad/caja/cierre - Cerrar la caja al final del día
// Accesible para secretaria y admin
router.post('/caja/cierre', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    const { monto_final_efectivo, notas } = req.body;
    const userId = req.user.id;

    if (monto_final_efectivo === undefined || isNaN(parseFloat(monto_final_efectivo))) {
        return res.status(400).json({ msg: 'El monto final en efectivo es requerido.' });
    }

    try {
        // Aquí iría la lógica para calcular el total esperado vs el total contado
        // Por ahora, solo registramos el evento de cierre.
        const transaccion = await pool.query(
            `INSERT INTO transacciones_caja (tipo_transaccion, monto, metodo_pago, descripcion, usuario_id)
             VALUES ('Cierre de Caja', $1, 'Efectivo', $2, $3) RETURNING id`,
            [monto_final_efectivo, notas, userId]
        );

        await audit(userId, 'Cierre de Caja', 'Contabilidad', transaccion.rows[0].id, { monto_contado: monto_final_efectivo });

        res.status(201).json({ msg: 'Caja cerrada exitosamente.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});


// RUTA: GET /api/contabilidad/reportes - Generar reportes financieros
// Accesible solo para admin
router.get('/reportes', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ msg: 'Las fechas de inicio y fin son requeridas.' });
  }

  try {
    // Consulta para obtener un resumen de transacciones en el rango de fechas
    const resumenQuery = `
      SELECT 
        tipo_transaccion, 
        metodo_pago, 
        COUNT(*) as numero_transacciones, 
        SUM(monto) as total_monto
      FROM transacciones_caja
      WHERE fecha BETWEEN $1 AND $2
      GROUP BY tipo_transaccion, metodo_pago
      ORDER BY tipo_transaccion, metodo_pago;
    `;

    // Consulta para obtener el detalle de todas las transacciones
    const detalleQuery = `
        SELECT t.*, u.nombre, u.apellido
        FROM transacciones_caja t
        JOIN profesionales u ON t.usuario_id = u.id
        WHERE t.fecha BETWEEN $1 AND $2
        ORDER BY t.fecha DESC;
    `;

    const [resumen, detalle] = await Promise.all([
        pool.query(resumenQuery, [fecha_inicio, fecha_fin]),
        pool.query(detalleQuery, [fecha_inicio, fecha_fin])
    ]);

    res.json({
      resumen: resumen.rows,
      detalle: detalle.rows
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
