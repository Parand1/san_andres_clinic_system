const pool = require('./config/db');
const bcrypt = require('bcrypt');

// --- ¡IMPORTANTE! ---
// Modifica los siguientes valores con tus datos reales para la cuenta de administrador.
const adminData = {
  cedula: '0000000000',
  nombre: 'Admin',
  apellido: 'San Andrés',
  email: 'pacom3@hotmail.es',
  password: 'pupito69',
};
// --------------------

const createAdminAccount = async () => {
  console.log('Iniciando creación de la cuenta de administrador...');

  try {
    // 1. Hashear la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);
    console.log('Contraseña hasheada exitosamente.');

    // 2. Insertar el usuario en la base de datos
    const query = `
      INSERT INTO profesionales (cedula, nombre, apellido, email, password_hash, rol)
      VALUES ($1, $2, $3, $4, $5, 'admin')
      RETURNING id, email, rol;
    `;
    const values = [
      adminData.cedula,
      adminData.nombre,
      adminData.apellido,
      adminData.email,
      passwordHash,
    ];

    const result = await pool.query(query, values);
    console.log('¡Cuenta de administrador creada exitosamente!');
    console.log('Detalles:', result.rows[0]);

  } catch (error) {
    if (error.code === '23505') { // Código de error para violación de unicidad
      console.error('Error: Ya existe un usuario con esa cédula o email.');
      console.error('Si necesitas recrear la cuenta, borra el usuario anterior de la tabla "profesionales".');
    } else {
      console.error('Ocurrió un error al crear la cuenta de administrador:', error);
    }
  } finally {
    // 3. Cerrar la conexión a la base de datos
    await pool.end();
    console.log('Conexión a la base de datos cerrada.');
  }
};

createAdminAccount();
