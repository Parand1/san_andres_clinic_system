import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete'; // Importar ícono de eliminar
import { useAuth } from '../AuthContext';

function PatientAttentionList({ patient, onBack, onEditAttention }) {
  const { token, user } = useAuth();
  const [attentions, setAttentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Estado para mensajes de éxito

  useEffect(() => {
    const fetchAttentions = async () => {
      if (!patient?.id) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/attentions?paciente_id=${patient.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          // Si es admin, muestra todas. Si es profesional, solo las suyas.
          if (user.rol !== 'admin') {
            setAttentions(data.filter(att => att.profesional_id === user.id));
          } else {
            setAttentions(data);
          }
        } else {
          setError(data.msg || 'Error al cargar atenciones.');
        }
      } catch (err) {
        setError('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttentions();
  }, [patient, token, user]);

  const handleDeleteAttention = async (attentionId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta atención? Esta acción es irreversible.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/attentions/${attentionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.msg || 'Atención eliminada exitosamente.');
        // Actualizar la lista de atenciones localmente
        setAttentions(prevAttentions => prevAttentions.filter(att => att.id !== attentionId));
      } else {
        setError(data.msg || 'Error al eliminar la atención.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  if (loading) return <Typography>Cargando atenciones...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button variant="outlined" onClick={onBack} sx={{ mb: 2 }}>
        Volver a Detalles
      </Button>
      <Typography variant="h5" gutterBottom>
        {user.rol === 'admin' ? 'Todas las Atenciones' : 'Mis Atenciones'} para {patient?.nombre} {patient?.apellido}
      </Typography>
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell>Profesional</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attentions.map((att) => (
              <TableRow key={att.id}>
                <TableCell>{new Date(att.fecha_atencion).toLocaleString()}</TableCell>
                <TableCell>{att.motivo_consulta}</TableCell>
                <TableCell>{`${att.profesional_nombre} ${att.profesional_apellido}`}</TableCell>
                <TableCell>
                  {/* El botón de editar es visible si es admin o si es el creador */}
                  {(user.rol === 'admin' || user.id === att.profesional_id) && (
                    <IconButton onClick={() => onEditAttention(att)} color="primary">
                      <EditIcon />
                    </IconButton>
                  )}
                  {/* El botón de eliminar solo es visible para el admin */}
                  {user.rol === 'admin' && (
                    <IconButton onClick={() => handleDeleteAttention(att.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default PatientAttentionList;
