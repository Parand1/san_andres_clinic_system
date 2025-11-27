const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // Importar path

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Middleware de logging para todas las solicitudes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rutas de la API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/professionals', require('./routes/professionalRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/specialties', require('./routes/professionalSpecialtiesRoutes'));
app.use('/api/cie10', require('./routes/cie10Routes'));
app.use('/api/attentions', require('./routes/attentionRoutes'));
app.use('/api/medical-history', require('./routes/medicalHistoryRoutes'));
app.use('/api/antecedents', require('./routes/antecedentsRoutes'));
app.use('/api/odontogram', require('./routes/odontogramRoutes'));
app.use('/api/psychology-evaluation', require('./routes/psychologyRoutes'));
app.use('/api/diagnostics', require('./routes/diagnosisRoutes'));
app.use('/api/citas', require('./routes/citasRoutes'));
app.use('/api/pagos', require('./routes/pagosRoutes'));
app.use('/api/contabilidad', require('./routes/contabilidadRoutes'));
app.use('/api/tarifario', require('./routes/tarifarioRoutes'));

// Servir archivos estáticos del frontend (después de las rutas de la API)
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Para cualquier otra ruta que no sea de la API, servir el index.html del frontend
app.get('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] Solicitud ${req.method} ${req.url} manejada por la ruta comodín (sirviendo index.html).`);
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});