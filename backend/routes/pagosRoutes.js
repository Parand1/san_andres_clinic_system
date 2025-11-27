const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Importar la función de auditoría (o definirla si no está en un servicio separado)
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

// RUTA: GET /api/pagos - Obtener pagos (filtrar por paciente o cita)
// Accesible para secretaria y admin
router.get('/', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
  try {
    const { paciente_id, cita_id } = req.query;
    let query = 'SELECT * FROM pagos WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (paciente_id) {
      query += ` AND paciente_id = $${paramIndex++}`;
      values.push(paciente_id);
    }
    if (cita_id) {
      query += ` AND cita_id = $${paramIndex++}`;
      values.push(cita_id);
    }

    const allPagos = await pool.query(query, values);
    res.json(allPagos.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// RUTA: POST /api/pagos/:id/registrar - Registrar un pago que estaba pendiente
// Accesible para secretaria y admin
router.post('/:id/registrar', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
  const { id } = req.params; // id del pago
  const { metodo_pago, notas } = req.body;
  const userId = req.user.id;

  if (!metodo_pago) {
    return res.status(400).json({ msg: 'El método de pago es requerido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Actualizar el pago
    const pagoResult = await client.query(
      `UPDATE pagos SET estado_pago = 'Pagado', metodo_pago = $1, notas = $2, fecha_pago = CURRENT_TIMESTAMP, registrado_por_user_id = $3
       WHERE id = $4 RETURNING *`,
      [metodo_pago, notas, userId, id]
    );

    if (pagoResult.rows.length === 0) {
      throw new Error('Pago no encontrado.');
    }
    const pagoActualizado = pagoResult.rows[0];

    // 2. Actualizar el estado de la cita a 'Pagada' SOLO si está en estados iniciales
    // Consultamos el estado actual de la cita
    const citaQuery = await client.query('SELECT estado_cita FROM citas WHERE id = $1', [pagoActualizado.cita_id]);
    const estadoActual = citaQuery.rows[0].estado_cita;

    // Solo cambiamos a 'Pagada' si estaba en Programada o Confirmada
    if (estadoActual === 'Programada' || estadoActual === 'Confirmada') {
        await client.query(
          `UPDATE citas SET estado_cita = 'Pagada', updated_by_user_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [userId, pagoActualizado.cita_id]
        );
        await audit(userId, `Cambio de Estado: ${estadoActual} -> Pagada`, 'Cita', pagoActualizado.cita_id);
    } else {
        // Si ya estaba avanzada, solo registramos que hubo un pago asociado, pero no movemos el flujo clínico
        await audit(userId, `Pago registrado para cita en estado: ${estadoActual}`, 'Cita', pagoActualizado.cita_id);
    }

    // 3. Crear la transacción de caja
    await client.query(
      `INSERT INTO transacciones_caja (tipo_transaccion, monto, metodo_pago, descripcion, usuario_id, pago_id)
       VALUES ('Ingreso por Consulta', $1, $2, $3, $4, $5)`,
      [pagoActualizado.monto_total, metodo_pago, `Pago de cita #${pagoActualizado.cita_id}`, userId, id]
    );

    // 4. Registrar auditoría para el pago y la cita
    await audit(userId, 'Registro de Pago', 'Pago', id, { monto: pagoActualizado.monto_total, metodo: metodo_pago });
    await audit(userId, `Cambio de Estado: Confirmada -> Pagada`, 'Cita', pagoActualizado.cita_id);

    await client.query('COMMIT');
    res.json({ msg: 'Pago registrado exitosamente', pago: pagoActualizado });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send(err.message || 'Error del servidor');
  } finally {
    client.release();
  }
});

// RUTA: POST /api/pagos/adicional - Crear un nuevo pago (Cobro extra o Registro de Procedimiento)
// Accesible para secretaria, admin y PROFESIONAL (para registrar procedimientos)
router.post('/adicional', authenticateToken, authorizeRoles('admin', 'secretaria', 'profesional'), async (req, res) => {
    const { cita_id, paciente_id, items, metodo_pago, notas } = req.body;
    const userId = req.user.id;

    if (!cita_id || !paciente_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ msg: 'Faltan datos para registrar el cargo.' });
    }

    // Si no hay método de pago, asumimos que es un cargo pendiente por cobrar en caja
    const estadoPago = metodo_pago ? 'Pagado' : 'Pendiente';
    // Usamos 'Efectivo' como placeholder si está pendiente, ya que la DB no permite nulos ni 'Por Definir' en el ENUM actual.
    // Al cobrar, se actualizará con el método real.
    const metodoPagoFinal = metodo_pago || 'Efectivo';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const monto_total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

        // 1. Crear el registro de pago
        const newPago = await client.query(
            `INSERT INTO pagos (cita_id, paciente_id, monto_total, metodo_pago, estado_pago, registrado_por_user_id, notas, fecha_pago)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING id`,
            [cita_id, paciente_id, monto_total, metodoPagoFinal, estadoPago, userId, notas]
        );
        const pagoId = newPago.rows[0].id;

        // 2. Insertar los items de pago
        for (const item of items) {
            await client.query(
                `INSERT INTO pagos_items (pago_id, descripcion, cantidad, precio_unitario, monto_item)
                 VALUES ($1, $2, $3, $4, $5)`,
                [pagoId, item.descripcion, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
            );
        }

        // 3. Crear la transacción de caja SOLO SI se pagó efectivamente
        if (estadoPago === 'Pagado') {
            await client.query(
                `INSERT INTO transacciones_caja (tipo_transaccion, monto, metodo_pago, descripcion, usuario_id, pago_id)
                 VALUES ('Ingreso Adicional', $1, $2, $3, $4, $5)`,
                [monto_total, metodoPagoFinal, `Cobro adicional para cita #${cita_id}`, userId, pagoId]
            );
        }

        // 4. Registrar en auditoría
        await audit(userId, `Registro de Cargo Adicional (${estadoPago})`, 'Pago', pagoId, { monto: monto_total, items: items.length });

        await client.query('COMMIT');
        res.status(201).json({ msg: `Cargo registrado exitosamente (${estadoPago})`, pago_id: pagoId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Error del servidor');
    } finally {
        client.release();
    }
});

module.exports = router;
