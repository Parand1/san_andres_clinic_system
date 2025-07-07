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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../AuthContext';
import NewAttentionForm from './NewAttentionForm'; // Importar NewAttentionForm

function PatientAttentionList({ patientId, onBack, patient }) { // Añadir patient como prop
  const { token, user } = useAuth();
  const [attentions, setAttentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [openEditForm, setOpenEditForm] = useState(false); // Cambiado a openEditForm
  const [attentionToEdit, setAttentionToEdit] = useState(null); // Atención a editar

  const fetchAttentions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/attentions?paciente_id=${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        // Filtrar para mostrar solo las atenciones creadas por el profesional actual si no es admin
        if (user.rol !== 'admin') {
          setAttentions(data.filter(att => att.profesional_id === user.id)); // Usar profesional_id
        } else {
          setAttentions(data);
        }
      } else {
        setError(data.msg || 'Error al cargar atenciones.');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor para cargar atenciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && patientId) {
      fetchAttentions();
    }
  }, [token, patientId]);

  const handleOpenEditForm = (attention) => { // Cambiado a handleOpenEditForm
    setAttentionToEdit(attention);
    setOpenEditForm(true);
  };

  const handleCloseEditForm = () => { // Cambiado a handleCloseEditForm
    setOpenEditForm(false);
    setAttentionToEdit(null);
    fetchAttentions(); // Recargar la lista después de cerrar el formulario de edición
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Cargando atenciones...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ my: 4 }}>
        <Button variant="outlined" onClick={onBack} sx={{ mb: 2 }}>
          Volver a Detalles del Paciente
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Mis Atenciones para {patient?.nombre} {patient?.apellido}
        </Typography>
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="attentions table">
            <TableHead>
              <TableRow>
                <TableCell>ID Atención</TableCell>
                <TableCell>Profesional</TableCell>
                <TableCell>Fecha Atención</TableCell>
                <TableCell>Motivo Consulta</TableCell>
                {user && user.rol === 'admin' && (
                  <>
                    <TableCell>Creado por</TableCell>
                    <TableCell>Última Modificación</TableCell>
                  </>
                )}
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attentions.map((attention) => (
                <TableRow
                  key={attention.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {attention.id}
                  </TableCell>
                  <TableCell>{attention.profesional_nombre} {attention.profesional_apellido}</TableCell>
                  <TableCell>{new Date(attention.fecha_atencion).toLocaleDateString()} {new Date(attention.fecha_atencion).toLocaleTimeString()}</TableCell>
                  <TableCell>{attention.motivo_consulta}</TableCell>
                  {user && user.rol === 'admin' && (
                    <>
                      <TableCell>
                        {attention.created_by_nombre && attention.created_by_apellido
                          ? `${attention.created_by_nombre} ${attention.created_by_apellido}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {attention.updated_at
                          ? `${new Date(attention.updated_at).toLocaleDateString()} ${new Date(attention.updated_at).toLocaleTimeString()}`
                          : 'N/A'}
                        {attention.updated_by_nombre && attention.updated_by_apellido
                          ? ` por ${attention.updated_by_nombre} ${attention.updated_by_apellido}`
                          : ''}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    {/* Solo el creador o un admin pueden editar */}
                    {(user && user.rol === 'admin') || (user && attention.profesional_id === user.id) ? (
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenEditForm(attention)}
                      >
                        <EditIcon />
                      </IconButton>
                    ) : (
                      <IconButton color="primary" disabled>
                        <EditIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Diálogo para Editar Atención usando NewAttentionForm */}
        <Dialog open={openEditForm} onClose={handleCloseEditForm} fullWidth maxWidth="md">
          <DialogTitle>Editar Atención ID: {attentionToEdit?.id}</DialogTitle>
          <DialogContent>
            {attentionToEdit && (
              <NewAttentionForm
                patient={patient} // Asegurarse de pasar la prop patient
                attention={attentionToEdit}
                onSaveSuccess={handleCloseEditForm} // Cerrar y recargar al guardar
                onCancel={handleCloseEditForm} // Cerrar al cancelar
              />
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </Container>
  );
}

export default PatientAttentionList;