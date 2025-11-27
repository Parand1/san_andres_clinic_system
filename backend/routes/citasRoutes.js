const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Nota: Un servicio de auditoría dedicado sería ideal, pero por ahora la lógica estará aquí.
const audit = async (userId, action, entity, entityId, details = {}) => {
  try {
    await pool.query(
      'INSERT INTO historial_auditoria (usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, entity, entityId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Error en el servicio de auditoría:', err.message);
    // No relanzar el error para no interrumpir la operación principal
  }
};

// RUTA: GET /api/citas - Obtener citas para el calendario
// Permite filtrar por rango de fechas y por profesional.
// Accesible para todos los roles autenticados.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, profesional_id } = req.query;
    let query = `
      SELECT 
        c.id, 
        c.paciente_id,
        c.notas_secretaria,
        c.fecha_hora_inicio AS "start", 
        c.fecha_hora_fin AS "end",
        p.nombre || ' ' || p.apellido AS title,
        c.estado_cita, 
        c.tipo_atencion,
        c.profesional_id,
        prof.nombre as profesional_nombre,
        prof.apellido as profesional_apellido,
        (SELECT COUNT(*) > 0 FROM pagos pg WHERE pg.cita_id = c.id AND pg.estado_pago = 'Pendiente') as tiene_pagos_pendientes
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN profesionales prof ON c.profesional_id = prof.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (fecha_inicio) {
      query += ` AND c.fecha_hora_inicio >= $${paramIndex++}`;
      values.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ` AND c.fecha_hora_fin <= $${paramIndex++}`;
      values.push(fecha_fin);
    }
    if (profesional_id) {
      query += ` AND c.profesional_id = $${paramIndex++}`;
      values.push(profesional_id);
    }

    query += ` ORDER BY c.fecha_hora_inicio ASC`;

    const allCitas = await pool.query(query, values);
    res.json(allCitas.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// RUTA: POST /api/citas - Crear una nueva cita
// Accesible para secretaria, profesional y admin.
router.post('/', authenticateToken, authorizeRoles('admin', 'profesional', 'secretaria'), async (req, res) => {
  const { 
    paciente_id, 
    profesional_id, 
    fecha_hora_inicio, 
    fecha_hora_fin, 
    tipo_atencion, 
    notas_secretaria 
  } = req.body;
  const userId = req.user.id;

  if (!paciente_id || !profesional_id || !fecha_hora_inicio || !fecha_hora_fin || !tipo_atencion) {
    return res.status(400).json({ msg: 'Todos los campos son requeridos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear la cita
    const newCita = await client.query(
      `INSERT INTO citas (paciente_id, profesional_id, fecha_hora_inicio, fecha_hora_fin, tipo_atencion, notas_secretaria, created_by_user_id, updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [paciente_id, profesional_id, fecha_hora_inicio, fecha_hora_fin, tipo_atencion, notas_secretaria, userId]
    );
    const citaCreada = newCita.rows[0];

    // 2. Registrar en auditoría
    await audit(userId, 'Creación de Cita', 'Cita', citaCreada.id, { paciente_id, profesional_id, fecha: fecha_hora_inicio });

    await client.query('COMMIT');
    res.status(201).json(citaCreada);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ msg: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// RUTA: PUT /api/citas/:id - Actualizar una cita (reagendar, cambiar notas)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'profesional', 'secretaria'), async (req, res) => {
  const { id } = req.params;
  const { fecha_hora_inicio, fecha_hora_fin, notas_secretaria } = req.body;
  const userId = req.user.id;

  try {
    const oldCita = await pool.query('SELECT * FROM citas WHERE id = $1', [id]);
    if (oldCita.rows.length === 0) {
      return res.status(404).json({ msg: 'Cita no encontrada.' });
    }

    const updatedCita = await pool.query(
      `UPDATE citas SET fecha_hora_inicio = $1, fecha_hora_fin = $2, notas_secretaria = $3, updated_by_user_id = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [fecha_hora_inicio, fecha_hora_fin, notas_secretaria, userId, id]
    );

    // Registrar en auditoría
    await audit(userId, 'Reagendamiento de Cita', 'Cita', id, { 
      de: oldCita.rows[0].fecha_hora_inicio, 
      a: fecha_hora_inicio 
    });

    res.json(updatedCita.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// RUTA: PATCH /api/citas/:id/estado - Actualizar solo el estado de una cita
router.patch('/:id/estado', authenticateToken, authorizeRoles('admin', 'profesional', 'secretaria'), async (req, res) => {
  const { id } = req.params;
  const { nuevo_estado } = req.body;
  const userId = req.user.id;

  if (!nuevo_estado) {
    return res.status(400).json({ msg: 'El nuevo estado es requerido.' });
  }

  try {
    const oldCita = await pool.query('SELECT estado_cita FROM citas WHERE id = $1', [id]);
    if (oldCita.rows.length === 0) {
      return res.status(404).json({ msg: 'Cita no encontrada.' });
    }

    const updatedCita = await pool.query(
      'UPDATE citas SET estado_cita = $1, updated_by_user_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [nuevo_estado, userId, id]
    );

    // Registrar en auditoría
    await audit(userId, `Cambio de Estado: ${oldCita.rows[0].estado_cita} -> ${nuevo_estado}`, 'Cita', id);

    res.json(updatedCita.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message || 'Error del servidor' });
  }
});

// RUTA: DELETE /api/citas/:id - Eliminar una cita
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'secretaria'), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener el pago asociado a la cita
    const pagoResult = await client.query('SELECT id FROM pagos WHERE cita_id = $1', [id]);
    if (pagoResult.rows.length > 0) {
      const pagoId = pagoResult.rows[0].id;
      // 2. Eliminar los items de pago
      await client.query('DELETE FROM pagos_items WHERE pago_id = $1', [pagoId]);
      // 3. Eliminar el pago
      await client.query('DELETE FROM pagos WHERE id = $1', [pagoId]);
    }

    // 4. Eliminar la cita
    const deletedCita = await client.query('DELETE FROM citas WHERE id = $1 RETURNING id', [id]);

    if (deletedCita.rows.length === 0) {
      throw new Error('Cita no encontrada.');
    }

    // 5. Registrar en auditoría
    await audit(userId, 'Eliminación de Cita', 'Cita', id);

    await client.query('COMMIT');
    res.json({ msg: 'Cita eliminada exitosamente.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ msg: err.message || 'Error del servidor' });
  } finally {
    client.release();
  }
});


module.exports = router;