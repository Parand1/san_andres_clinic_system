const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener el ÚLTIMO odontograma registrado de un paciente (independientemente de la atención)
router.get('/patient/:patient_id/latest', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { patient_id } = req.params;
    
    // Buscar el ID del último odontograma del paciente
    const latestIdQuery = await pool.query(`
      SELECT o.id
      FROM odontograma_registros o
      JOIN atenciones a ON o.atencion_id = a.id
      WHERE a.paciente_id = $1
      ORDER BY o.fecha_registro DESC, o.id DESC
      LIMIT 1
    `, [patient_id]);

    if (latestIdQuery.rows.length === 0) {
      return res.status(404).json({ msg: 'No hay odontogramas previos para este paciente.' });
    }

    const latestId = latestIdQuery.rows[0].id;

    // Obtener los detalles de ese odontograma específico
    const odontogram = await pool.query(`
      SELECT
        o.id AS odontograma_id, o.atencion_id, o.fecha_registro, o.observaciones_generales,
        COALESCE(json_agg(d.*) FILTER (WHERE d.id IS NOT NULL), '[]') AS dientes
      FROM odontograma_registros o
      LEFT JOIN odontograma_dientes d ON o.id = d.odontograma_registro_id
      WHERE o.id = $1
      GROUP BY o.id, o.atencion_id, o.fecha_registro, o.observaciones_generales
    `, [latestId]);

    res.json(odontogram.rows[0]);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para obtener un registro de odontograma por atencion_id
router.get('/:atencion_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  try {
    const { atencion_id } = req.params;
    const odontogram = await pool.query(`
      SELECT
        o.id AS odontograma_id, o.atencion_id, o.fecha_registro, o.observaciones_generales,
        o.created_by_professional_id, o.updated_by_professional_id, o.updated_at,
        cb.nombre AS created_by_nombre, cb.apellido AS created_by_apellido,
        ub.nombre AS updated_by_nombre, ub.apellido AS updated_by_apellido,
        COALESCE(json_agg(d.*) FILTER (WHERE d.id IS NOT NULL), '[]') AS dientes
      FROM odontograma_registros o
      LEFT JOIN odontograma_dientes d ON o.id = d.odontograma_registro_id
      LEFT JOIN profesionales cb ON o.created_by_professional_id = cb.id
      LEFT JOIN profesionales ub ON o.updated_by_professional_id = ub.id
      WHERE o.atencion_id = $1
      GROUP BY o.id, o.atencion_id, o.fecha_registro, o.observaciones_generales,
               o.created_by_professional_id, o.updated_by_professional_id, o.updated_at,
               cb.nombre, cb.apellido, ub.nombre, ub.apellido
    `, [atencion_id]);

    if (odontogram.rows.length === 0) {
      return res.status(404).json({ msg: 'Odontograma no encontrado para esta atención.' });
    }
    res.json(odontogram.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para crear un nuevo registro de odontograma
router.post('/', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  console.log('--- INICIO POST /api/odontogram ---');
  console.log('Body recibido:', JSON.stringify(req.body, null, 2));

  const { atencion_id, observaciones_generales, dientes } = req.body;
  const professionalId = req.user.id;

  if (!atencion_id) {
    console.error('Error: Falta atencion_id');
    return res.status(400).json({ msg: 'ID de atención es requerido.' });
  }

  console.log(`Procesando odontograma para Atencion ID: ${atencion_id}`);
  if (dientes) console.log(`Cantidad de dientes a guardar: ${dientes.length}`);
  else console.log('ADVERTENCIA: Array de dientes es undefined o null');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear el registro principal del odontograma
    const newOdontogram = await client.query(
      'INSERT INTO odontograma_registros (atencion_id, observaciones_generales, created_by_professional_id, updated_by_professional_id) VALUES ($1, $2, $3, $4) RETURNING id' ,
      [atencion_id, observaciones_generales, professionalId, professionalId]
    );
    const odontograma_registro_id = newOdontogram.rows[0].id;
    console.log(`Registro principal creado. ID: ${odontograma_registro_id}`);

    // 2. Insertar los detalles de los dientes
    if (dientes && dientes.length > 0) {
      for (const diente of dientes) {
        // Asegurar que condiciones_superficies sea un JSON válido stringify si es objeto
        // Postgres driver suele manejar objetos a JSONB auto, pero vamos a loguear
        // console.log('Insertando diente:', diente);
        
        await client.query(
          'INSERT INTO odontograma_dientes (odontograma_registro_id, numero_diente, tipo_diente, estado_general, condiciones_superficies, observaciones_diente) VALUES ($1, $2, $3, $4, $5, $6)' ,
          [odontograma_registro_id, diente.numero_diente, diente.tipo_diente, diente.estado_general, diente.condiciones_superficies, diente.observaciones_diente]
        );
      }
      console.log('Todos los dientes insertados correctamente.');
    } else {
        console.log('No hay dientes para insertar en este odontograma.');
    }

    await client.query('COMMIT');
    console.log('--- FIN POST /api/odontogram (EXITO) ---');
    res.status(201).json({ msg: 'Odontograma registrado exitosamente', odontograma_id: odontograma_registro_id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('--- ERROR EN POST /api/odontogram ---');
    console.error(err);
    res.status(500).send('Error del servidor: ' + err.message);
  } finally {
    client.release();
  }
});

// Ruta para actualizar un registro de odontograma
router.put('/:atencion_id', authenticateToken, authorizeRoles('admin', 'profesional'), async (req, res) => {
  const { atencion_id } = req.params;
  const { observaciones_generales, dientes } = req.body;
  const professionalId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar si el profesional autenticado es el creador de la atención o un admin
    const attentionCreator = await client.query('SELECT created_by_professional_id FROM atenciones WHERE id = $1', [atencion_id]);
    if (attentionCreator.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: 'Atención no encontrada.' });
    }
    if (req.user.rol !== 'admin' && attentionCreator.rows[0].created_by_professional_id !== professionalId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ msg: 'Acceso denegado: Solo el creador de la atención o un administrador pueden modificar su odontograma.' });
    }

    // Obtener el ID del registro de odontograma asociado a esta atención
    const odontogramRecord = await client.query('SELECT id FROM odontograma_registros WHERE atencion_id = $1', [atencion_id]);
    if (odontogramRecord.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: 'Odontograma no encontrado para esta atención. Use POST para crearlo.' });
    }
    const odontograma_registro_id = odontogramRecord.rows[0].id;

    // 1. Actualizar el registro principal del odontograma
    await client.query(
      'UPDATE odontograma_registros SET observaciones_generales = $1, updated_by_professional_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3' ,
      [observaciones_generales, professionalId, odontograma_registro_id]
    );

    // 2. Eliminar dientes existentes y reinsertar los nuevos (simplificación para PUT completo)
    await client.query('DELETE FROM odontograma_dientes WHERE odontograma_registro_id = $1', [odontograma_registro_id]);
    if (dientes && dientes.length > 0) {
      for (const diente of dientes) {
        await client.query(
          'INSERT INTO odontograma_dientes (odontograma_registro_id, numero_diente, tipo_diente, estado_general, condiciones_superficies, observaciones_diente) VALUES ($1, $2, $3, $4, $5, $6)' ,
          [odontograma_registro_id, diente.numero_diente, diente.tipo_diente, diente.estado_general, diente.condiciones_superficies, diente.observaciones_diente]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ msg: 'Odontograma actualizado exitosamente', odontograma_id: odontograma_registro_id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Error del servidor');
  } finally {
    client.release();
  }
});

// Ruta para eliminar un registro de odontograma (solo admin)
router.delete('/:atencion_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { atencion_id } = req.params;
    const deletedOdontogram = await pool.query('DELETE FROM odontograma_registros WHERE atencion_id = $1 RETURNING id', [atencion_id]);

    if (deletedOdontogram.rows.length === 0) {
      return res.status(404).json({ msg: 'Odontograma no encontrado para esta atención.' });
    }

    res.json({ msg: 'Odontograma eliminado exitosamente', id: deletedOdontogram.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
