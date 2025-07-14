import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';

function PatientDetailView({ patient, onNewAttention, onEditAttentions, onShowHistory }) {
  if (!patient) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h6" align="center">
          Seleccione un paciente para ver sus detalles.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Detalles del Paciente
        </Typography>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <Typography variant="body1"><strong>Cédula:</strong> {patient.cedula}</Typography>
            </Grid>
            <Grid xs={12} sm={6}>
              <Typography variant="body1"><strong>Nombre:</strong> {patient.nombre} {patient.apellido}</Typography>
            </Grid>
            <Grid xs={12} sm={6}>
              <Typography variant="body1"><strong>Fecha Nacimiento:</strong> {patient.fecha_nacimiento ? new Date(patient.fecha_nacimiento).toLocaleDateString() : 'N/A'}</Typography>
            </Grid>
            <Grid xs={12} sm={6}>
              <Typography variant="body1"><strong>Género:</strong> {patient.genero || 'N/A'}</Typography>
            </Grid>
            <Grid xs={12} sm={6}>
              <Typography variant="body1"><strong>Teléfono:</strong> {patient.telefono || 'N/A'}</Typography>
            </Grid>
            <Grid xs={12} sm={6}>
              <Typography variant="body1"><strong>Email:</strong> {patient.email || 'N/A'}</Typography>
            </Grid>
            <Grid xs={12}>
              <Typography variant="body1"><strong>Dirección:</strong> {patient.direccion || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onNewAttention}
          >
            Registrar Nueva Atención
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={onEditAttentions}
          >
            Editar Mis Atenciones
          </Button>
          <Button
            variant="outlined"
            color="info"
            startIcon={<HistoryIcon />}
            onClick={onShowHistory}
          >
            Historial de Atenciones
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default PatientDetailView;
