import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Avatar,
  Chip,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import HomeIcon from '@mui/icons-material/Home';

function stringToColor(string) {
  let hash = 0;
  let i;
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.substr(-2);
  }
  return color;
}

function PatientDetailView({ patient, onNewAttention, onEditAttentions, onShowHistory }) {
  if (!patient) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        
        {/* TARJETA DE PERFIL PRINCIPAL */}
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4, mb: 4, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ 
                position: 'absolute', top: 0, left: 0, width: '100%', height: '8px', 
                background: 'linear-gradient(90deg, #00A79D 0%, #673AB7 100%)' 
            }} />
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4 }}>
                <Avatar 
                    sx={{ 
                        width: 100, height: 100, 
                        bgcolor: stringToColor(patient.nombre + patient.apellido),
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                    }}
                >
                    {patient.nombre[0]}{patient.apellido[0]}
                </Avatar>
                
                <Box sx={{ flexGrow: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        {patient.nombre} {patient.apellido}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, mb: 2 }}>
                        <Chip label={patient.cedula} color="primary" variant="outlined" size="small" />
                        <Chip label={patient.genero || 'N/A'} size="small" />
                        {patient.fecha_nacimiento && (
                            <Chip 
                                icon={<CalendarMonthIcon />} 
                                label={new Date(patient.fecha_nacimiento).toLocaleDateString()} 
                                size="small" 
                            />
                        )}
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                <PhoneIcon fontSize="small" />
                                <Typography variant="body2">{patient.telefono || 'Sin teléfono'}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                <EmailIcon fontSize="small" />
                                <Typography variant="body2">{patient.email || 'Sin email'}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                <HomeIcon fontSize="small" />
                                <Typography variant="body2">{patient.direccion || 'Sin dirección'}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Paper>

        {/* ACCIONES */}
        <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} md={4}>
                <Button 
                    fullWidth 
                    variant="contained" 
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={onNewAttention}
                    sx={{ py: 2, borderRadius: 3, fontSize: '1rem', fontWeight: 'bold' }}
                >
                    Nueva Atención
                </Button>
            </Grid>
            <Grid item xs={12} md={4}>
                <Button 
                    fullWidth 
                    variant="outlined" 
                    size="large"
                    color="info"
                    startIcon={<HistoryIcon />}
                    onClick={onShowHistory}
                    sx={{ py: 2, borderRadius: 3, border: '2px solid', '&:hover': { borderWidth: '2px' } }}
                >
                    Ver Historial
                </Button>
            </Grid>
            <Grid item xs={12} md={4}>
                <Button 
                    fullWidth 
                    variant="outlined" 
                    size="large"
                    color="secondary"
                    startIcon={<EditIcon />}
                    onClick={onEditAttentions}
                    sx={{ py: 2, borderRadius: 3, border: '2px solid', '&:hover': { borderWidth: '2px' } }}
                >
                    Editar Mis Atenciones
                </Button>
            </Grid>
        </Grid>
    </Container>
  );
}

export default PatientDetailView;