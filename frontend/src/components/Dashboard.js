import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Grid, Paper, Divider } from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { useAuth } from '../AuthContext';

const motivationalQuotes = [
  "La buena medicina es la que actúa menos sobre los síntomas que sobre sus causas.",
  "El arte de la medicina consiste en mantener al paciente en buen estado de ánimo mientras la naturaleza lo va curando.",
  "Donde quiera que se ame el arte de la medicina, se ama también a la humanidad.",
  "El médico competente, antes de dar una medicina a su paciente, se familiariza no solo con la enfermedad que desea curar, sino también con los hábitos y la constitución del enfermo.",
  "La medicina es la única profesión que lucha incansablemente para destruirse a sí misma.",
  "La salud es un estado de completo bienestar físico, mental y social, y no solamente la ausencia de afecciones o enfermedades.",
  "Prevenir es mejor que curar."
];

function Dashboard() {
  const { user } = useAuth();
  const [quote, setQuote] = useState('');

  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    setQuote(motivationalQuotes[dayOfYear % motivationalQuotes.length]);
  }, []);

  const today = new Date();
  const dateString = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Main Welcome Card */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              ¡Bienvenido, {user ? user.nombre : 'Usuario'}!
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Rol: {user ? user.rol : 'N/A'}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Especialidades: {user?.especialidades?.join(', ') || 'No asignadas'}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="body1" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                "{quote}"
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Side Card for Date and Icon */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="h5" component="p" color="primary" sx={{ textTransform: 'capitalize' }}>
              {dateString}
            </Typography>
            <MedicalServicesIcon sx={{ fontSize: 100, color: 'primary.main', mt: 2 }} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;
