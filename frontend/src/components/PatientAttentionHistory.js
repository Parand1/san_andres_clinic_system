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
  Alert,
} from '@mui/material';
import { useAuth } from '../AuthContext';

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
          setAttentions(data);
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

  if (loading) return <Typography>Cargando historial...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button variant="outlined" onClick={onBack} sx={{ mb: 2 }}>
        Volver a Detalles
      </Button>
      <Typography variant="h5" gutterBottom>
        Historial de Atenciones para {patient?.nombre} {patient?.apellido}
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
                  <Button size="small" onClick={() => onShowAttentionDetails(att)}>
                    Ver Detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default PatientAttentionHistory;
