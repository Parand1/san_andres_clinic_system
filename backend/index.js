const express = require('express');
const cors = require('cors');
const pool = require('./config/db'); // Importamos el pool de conexión

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const professionalRoutes = require('./routes/professionalRoutes');
const patientRoutes = require('./routes/patientRoutes');
const attentionRoutes = require('./routes/attentionRoutes');
const cie10Routes = require('./routes/cie10Routes');
const diagnosisRoutes = require('./routes/diagnosisRoutes');
const medicalHistoryRoutes = require('./routes/medicalHistoryRoutes');
const antecedentsRoutes = require('./routes/antecedentsRoutes');
const odontogramRoutes = require('./routes/odontogramRoutes');
const psychologyRoutes = require('./routes/psychologyRoutes');
const professionalSpecialtiesRoutes = require('./routes/professionalSpecialtiesRoutes'); // Nuevo

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/attentions', attentionRoutes);
app.use('/api/cie10', cie10Routes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/medical-history', medicalHistoryRoutes);
app.use('/api/antecedents', antecedentsRoutes);
app.use('/api/odontogram', odontogramRoutes);
app.use('/api/psychology', psychologyRoutes);
app.use('/api/professional-specialties', professionalSpecialtiesRoutes); // Nuevo

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡El servidor del Centro Médico San Andrés está funcionando!');
});

// Probamos la conexión a la BD
const checkDatabaseConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Conexión a la base de datos exitosa:', result.rows[0]);
  } catch (err) {
    console.error('Error al conectar con la base de datos:', err.stack);
  }
};

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
  checkDatabaseConnection();
});
