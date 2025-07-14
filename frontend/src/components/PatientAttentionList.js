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
import { useAuth } from '../AuthContext';

function PatientAttentionList({ patient, onBack, onEditAttention }) {
  const { token, user } = useAuth();
  const [attentions, setAttentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <Typography>Cargando atenciones...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button variant="outlined" onClick={onBack} sx={{ mb: 2 }}>
        Volver a Detalles
      </Button>
      <Typography variant="h5" gutterBottom>
        Mis Atenciones para {patient?.nombre} {patient?.apellido}
      </Typography>
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
                  <IconButton onClick={() => onEditAttention(att)} color="primary">
                    <EditIcon />
                  </IconButton>
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
