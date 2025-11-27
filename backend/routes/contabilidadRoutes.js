const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Función auxiliar para auditoría
const audit = async (userId, action, entity, entityId, details = {}) => {
  try {
    await pool.query(
      'INSERT INTO historial_auditoria (usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, entity, entityId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Error auditoría:', err.message);
  }
};

// RUTA: GET /api/contabilidad/caja/estado - Obtener estado actual de la caja
router.get('/caja/estado', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // 1. Buscar si hay apertura hoy
        const aperturaQuery = await pool.query(
            `SELECT * FROM transacciones_caja 
             WHERE tipo_transaccion = 'Apertura de Caja' 
             AND fecha BETWEEN $1 AND $2 
             ORDER BY fecha DESC LIMIT 1`,
            [todayStart.toISOString(), todayEnd.toISOString()]
        );

        const cajaAbierta = aperturaQuery.rows.length > 0;
        let resumen = {
            saldo_inicial: 0,
            total_ingresos: 0,
            total_egresos: 0,
            saldo_actual: 0,
            movimientos: []
        };

        if (cajaAbierta) {
            const apertura = aperturaQuery.rows[0];
            resumen.saldo_inicial = parseFloat(apertura.monto);

            // 2. Obtener todos los movimientos desde la apertura
            const movimientosQuery = await pool.query(
                `SELECT t.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido
                 FROM transacciones_caja t
                 JOIN profesionales u ON t.usuario_id = u.id
                 WHERE t.fecha >= $1 AND t.fecha <= $2
                 ORDER BY t.fecha DESC`,
                [apertura.fecha, todayEnd.toISOString()]
            );

            resumen.movimientos = movimientosQuery.rows;

            // Calcular totales
            resumen.movimientos.forEach(m => {
                const monto = parseFloat(m.monto);
                if (m.tipo_transaccion === 'Apertura de Caja') {
                    // Ya contado en saldo inicial
                } else if (m.tipo_transaccion === 'Egreso' || m.tipo_transaccion === 'Cierre de Caja') {
                    resumen.total_egresos += monto;
                } else {
                    // Ingresos (Consulta, Adicional, Venta Directa)
                    resumen.total_ingresos += monto;
                }
            });

            resumen.saldo_actual = resumen.saldo_inicial + resumen.total_ingresos - resumen.total_egresos;
        } else {
            // 3. Si no está abierta, buscar el último cierre para sugerir monto
            const ultimoCierre = await pool.query(
                `SELECT monto FROM transacciones_caja 
                 WHERE tipo_transaccion = 'Cierre de Caja' 
                 ORDER BY fecha DESC LIMIT 1`
            );
            if (ultimoCierre.rows.length > 0) {
                resumen.ultimo_cierre = parseFloat(ultimoCierre.rows[0].monto);
            }
        }

        res.json({ cajaAbierta, ...resumen });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// RUTA: POST /api/contabilidad/movimiento - Registrar movimiento directo (Venta o Gasto)
router.post('/movimiento', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    const { tipo, monto, metodo_pago, descripcion, items } = req.body; // tipo: 'Ingreso', 'Egreso'
    const userId = req.user.id;

    if (!monto || !tipo || !descripcion) {
        return res.status(400).json({ msg: 'Datos incompletos.' });
    }

    // Mapeo de tipos genéricos a tipos de DB
    const dbTipo = tipo === 'Ingreso' ? 'Ingreso Adicional' : 'Egreso';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Registrar transacción en caja
        const transaccion = await pool.query(
            `INSERT INTO transacciones_caja (tipo_transaccion, monto, metodo_pago, descripcion, usuario_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [dbTipo, monto, metodo_pago || 'Efectivo', descripcion, userId]
        );

        // 2. Si es una venta con items, podríamos guardarlos en una tabla auxiliar 'ventas_directas'
        // Por simplicidad y tiempo, los guardaremos como detalle JSON en la auditoría o en la descripción extendida si fuera necesario.
        // Para esta versión v2, la descripción concatenada basta, pero dejaremos la estructura lista.

        await audit(userId, `Registro de ${dbTipo}`, 'Contabilidad', transaccion.rows[0].id, { items });

        await client.query('COMMIT');
        res.json({ msg: 'Movimiento registrado exitosamente.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Error del servidor');
    } finally {
        client.release();
    }
});

// RUTA: PUT /api/contabilidad/movimiento/:id - Editar movimiento manual
router.put('/movimiento/:id', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    const { id } = req.params;
    const { monto, descripcion, metodo_pago, tipo } = req.body;
    const userId = req.user.id;
    const userRole = req.user.rol;

    try {
        // 1. Verificar que la transacción exista y obtener sus datos
        const currentQuery = await pool.query('SELECT * FROM transacciones_caja WHERE id = $1', [id]);
        if (currentQuery.rows.length === 0) return res.status(404).json({ msg: 'Transacción no encontrada' });
        const current = currentQuery.rows[0];

        // 2. Validar Permisos: Solo Admin o el Dueño pueden editar
        if (userRole !== 'admin' && current.usuario_id !== userId) {
            return res.status(403).json({ msg: 'No tienes permiso para editar este movimiento.' });
        }

        // 3. Validar Tipo: Solo movimientos manuales (pago_id IS NULL)
        // Si tiene pago_id, pertenece a una cita y no debe editarse por aquí para no romper la integridad
        if (current.pago_id !== null) {
            return res.status(403).json({ msg: 'No se pueden editar transacciones vinculadas a citas desde aquí.' });
        }

        // 4. Actualizar
        // Mapeo de tipo simple a tipo DB (si se cambió)
        let dbTipo = current.tipo_transaccion;
        if (tipo) {
             dbTipo = tipo === 'Ingreso' ? 'Ingreso Adicional' : 'Egreso';
        }

        await pool.query(
            `UPDATE transacciones_caja 
             SET monto = $1, descripcion = $2, metodo_pago = $3, tipo_transaccion = $4 
             WHERE id = $5`,
            [monto, descripcion, metodo_pago, dbTipo, id]
        );

        await audit(userId, 'Edición de Movimiento Caja', 'Contabilidad', id, { antes: current, despues: req.body });

        res.json({ msg: 'Movimiento actualizado exitosamente.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// RUTA: DELETE /api/contabilidad/movimiento/:id - Eliminar movimiento manual
router.delete('/movimiento/:id', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.rol;

    try {
        // 1. Verificar existencia
        const currentQuery = await pool.query('SELECT * FROM transacciones_caja WHERE id = $1', [id]);
        if (currentQuery.rows.length === 0) return res.status(404).json({ msg: 'Transacción no encontrada' });
        const current = currentQuery.rows[0];

        // 2. Validar Permisos (Admin o Dueño)
        if (userRole !== 'admin' && current.usuario_id !== userId) {
            return res.status(403).json({ msg: 'No tienes permiso para eliminar este movimiento.' });
        }

        // 3. Validar Tipo (Solo manuales)
        if (current.pago_id !== null) {
            return res.status(403).json({ msg: 'No se pueden eliminar transacciones de citas. Debes anular el pago de la cita.' });
        }
        
        // No permitir borrar Aperturas o Cierres para no romper el historial, salvo admin quizas (pero por seguridad mejor bloqueamos)
        if (current.tipo_transaccion === 'Apertura de Caja' || current.tipo_transaccion === 'Cierre de Caja') {
             if (userRole !== 'admin') return res.status(403).json({ msg: 'Solo el administrador puede eliminar Aperturas o Cierres.' });
        }

        // 4. Eliminar
        await pool.query('DELETE FROM transacciones_caja WHERE id = $1', [id]);

        await audit(userId, 'Eliminación de Movimiento Caja', 'Contabilidad', id, { detalle: current });

        res.json({ msg: 'Movimiento eliminado exitosamente.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// RUTA: POST /api/contabilidad/caja/apertura
router.post('/caja/apertura', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
  const { monto_inicial } = req.body;
  const userId = req.user.id;

  try {
    const transaccion = await pool.query(
      `INSERT INTO transacciones_caja (tipo_transaccion, monto, metodo_pago, descripcion, usuario_id)
       VALUES ('Apertura de Caja', $1, 'Efectivo', 'Fondo de caja inicial', $2) RETURNING id`,
      [monto_inicial, userId]
    );
    res.json({ msg: 'Caja abierta exitosamente.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// RUTA: POST /api/contabilidad/caja/cierre
router.post('/caja/cierre', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
    const { monto_final_efectivo, notas } = req.body;
    const userId = req.user.id;

    try {
        // Registrar el cierre como un "movimiento" informativo (aunque técnicamente el dinero se queda o se deposita)
        // Lo marcaremos como tipo 'Cierre de Caja'
        await pool.query(
            `INSERT INTO transacciones_caja (tipo_transaccion, monto, metodo_pago, descripcion, usuario_id)
             VALUES ('Cierre de Caja', $1, 'Efectivo', $2, $3)`,
            [monto_final_efectivo, notas, userId]
        );
        res.json({ msg: 'Caja cerrada exitosamente.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

module.exports = router;
