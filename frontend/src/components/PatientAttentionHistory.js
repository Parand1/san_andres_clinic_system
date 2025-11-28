import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  CircularProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useAuth } from '../AuthContext';

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

function PatientAttentionHistory({ patientId, onBack, onShowAttentionDetails, patient }) {
  const { token } = useAuth();
  const [attentions, setAttentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAttentions = async () => {
      if (!patientId) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/attentions?paciente_id=${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          const sortedData = data.sort((a, b) => new Date(b.fecha_atencion) - new Date(a.fecha_atencion));
          setAttentions(sortedData);
        } else {
          setError(data.msg || 'Error al cargar historial.');
        }
      } catch (err) {
        setError('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttentions();
  }, [patientId, token]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: 'text.secondary' }}>
                Volver
            </Button>
            <Typography variant="h4" fontWeight="bold">
                Historial Clínico
            </Typography>
          </Box>
          <Chip 
            icon={<PersonIcon />} 
            label={`${patient?.nombre} ${patient?.apellido}`} 
            variant="outlined" 
            sx={{ fontWeight: 'bold', fontSize: '1rem', py: 2, px: 1 }}
          />
      </Box>

      {attentions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: '#f9f9f9' }}>
              <EventNoteIcon sx={{ fontSize: 60, color: '#ddd', mb: 2 }} />
              <Typography color="text.secondary">No hay atenciones registradas para este paciente.</Typography>
          </Paper>
      ) : (
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: '#f9fafb' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>FECHA Y HORA</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>MOTIVO DE CONSULTA</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>PROFESIONAL</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', color: '#666' }}>DETALLES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attentions.map((att) => {
                    const doctorName = `${att.profesional_nombre} ${att.profesional_apellido}`;
                    return (
                      <TableRow key={att.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s' }}>
                        <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {new Date(att.fecha_atencion).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(att.fecha_atencion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {att.motivo_consulta || 'Sin motivo registrado'}
                            </Typography>
                        </TableCell>
                        <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar 
                                    sx={{ 
                                        width: 32, height: 32, 
                                        fontSize: '0.8rem', 
                                        bgcolor: stringToColor(doctorName)
                                    }}
                                >
                                    {att.profesional_nombre[0]}{att.profesional_apellido[0]}
                                </Avatar>
                                <Typography variant="body2">Dr. {doctorName}</Typography>
                            </Box>
                        </TableCell>
                        <TableCell align="center">
                            <Tooltip title="Ver Detalles Completos">
                                <IconButton color="primary" onClick={() => onShowAttentionDetails(att)}>
                                    <VisibilityIcon />
                                </IconButton>
                            </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                })}
              </TableBody>
            </Table>
          </TableContainer>
      )}
    </Container>
  );
}

export default PatientAttentionHistory;