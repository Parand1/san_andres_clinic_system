import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom'; // <-- AÑADIDO
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useAuth } from '../AuthContext';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

const motivationalQuotes = [
  "La buena medicina es la que actúa menos sobre los síntomas que sobre sus causas.",
  "El arte de la medicina es animar al paciente mientras la naturaleza lo cura.",
  "Donde quiera que se ame el arte de la medicina, se ama también a la humanidad.",
];

// Componente para la tabla de citas del día
function DailyAppointmentsTable() {
  const { token, user } = useAuth();
  const navigate = useNavigate(); // <-- AÑADIDO
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchAppointments = async () => {
    const today = new Date();
    const startDate = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endDate = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    
    let url = `/api/citas?fecha_inicio=${startDate}&fecha_fin=${endDate}`;
    if (user.rol === 'profesional') {
      url += `&profesional_id=${user.id}`;
    }

    try {
      setLoading(true);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) {
        setAppointments(data);
      } else {
        setError(data.msg || 'Error al cargar citas del día.');
      }
    } catch (err) {
      setError('No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAppointments();
    }
  }, [token, user]);

  const handleUpdateState = async (id, newState) => {
    setError('');
    try {
        const response = await fetch(`/api/citas/${id}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ nuevo_estado: newState }),
        });

        if (response.ok) {
            fetchAppointments();
        } else {
            const data = await response.json();
            setError(data.msg || 'Error al actualizar el estado.');
        }
    } catch (err) {
        setError('No se pudo conectar al servidor para actualizar.');
    }
  };

  const handleOpenPaymentDialog = (appointment) => {
    setSelectedAppointment(appointment);
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setSelectedAppointment(null);
    setPaymentDialogOpen(false);
  };

  const handleSavePayment = async (paymentData) => {
    setError('');
    if (!selectedAppointment) return;

    // Aquí necesitamos encontrar el ID del pago asociado a la cita.
    // Esto es una simplificación. Una mejor solución sería que la API de citas devuelva el pago_id pendiente.
    // Por ahora, vamos a buscarlo.
    try {
        const pagosResponse = await fetch(`/api/pagos?cita_id=${selectedAppointment.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const pagos = await pagosResponse.json();
        const pagoPendiente = pagos.find(p => p.estado_pago === 'Pendiente');

        if (!pagoPendiente) {
            setError('No se encontró un pago pendiente para esta cita.');
            return;
        }

        const response = await fetch(`/api/pagos/${pagoPendiente.id}/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(paymentData),
        });

        if (response.ok) {
            fetchAppointments();
            handleClosePaymentDialog();
        } else {
            const data = await response.json();
            setError(data.msg || 'Error al registrar el pago.');
        }
    } catch (err) {
        setError('Error de comunicación al registrar el pago.');
    }
  };

  const handleAttend = (appointment) => {
    navigate('/attentions', { state: { appointmentData: appointment } });
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2 }}>Citas para Hoy</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Hora</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell>Profesional</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.map((apt) => (
              <TableRow key={apt.id}>
                <TableCell>{new Date(apt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                <TableCell>{apt.title}</TableCell>
                <TableCell>{`${apt.profesional_nombre} ${apt.profesional_apellido}`}</TableCell>
                <TableCell>{apt.tipo_atencion}</TableCell>
                <TableCell>
                  <Chip label={apt.estado_cita} size="small" color={apt.estado_cita === 'Pagada' ? 'success' : 'default'} />
                  {apt.procedimientos_adicionales_facturables && apt.estado_cita === 'Atendiendo' && (
                    <Chip 
                      icon={<MonetizationOnIcon />}
                      label="Cobro Adicional"
                      size="small"
                      color="warning"
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {user.rol === 'secretaria' && apt.estado_cita === 'Confirmada' && (
                      <Button size="small" variant="contained" color="success" onClick={() => handleOpenPaymentDialog(apt)}>Registrar Pago</Button>
                  )}
                  {user.rol === 'secretaria' && apt.estado_cita === 'Programada' && (
                      <Button size="small" onClick={() => handleUpdateState(apt.id, 'Confirmada')}>Confirmar</Button>
                  )}
                  {user.rol === 'secretaria' && apt.estado_cita === 'Pagada' && (
                      <Button size="small" onClick={() => handleUpdateState(apt.id, 'En Sala de Espera')}>Check-In</Button>
                  )}
                  {user.rol === 'profesional' && apt.estado_cita === 'En Sala de Espera' && (
                      <Button size="small" variant="contained" onClick={() => handleAttend(apt)}>Atender</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedAppointment && (
        <PaymentDialog 
            open={paymentDialogOpen} 
            onClose={handleClosePaymentDialog} 
            onSave={handleSavePayment} 
            appointment={selectedAppointment} 
        />
      )}
    </>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [quote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

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
          <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              ¡Bienvenido, {user ? user.nombre : 'Usuario'}!
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Rol: {user ? user.rol : 'N/A'}
            </Typography>
            {user && user.rol === 'profesional' && (
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    Especialidades: {user?.especialidades?.join(', ') || 'No asignadas'}
                </Typography>
            )}
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
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="h5" component="p" color="primary" sx={{ textTransform: 'capitalize' }}>
              {dateString}
            </Typography>
            <MedicalServicesIcon sx={{ fontSize: 100, color: 'primary.main', mt: 2 }} />
          </Paper>
        </Grid>

        {/* Daily Appointments Table - Visible for Admin and Secretaria */}
        {(user.rol === 'admin' || user.rol === 'secretaria' || user.rol === 'profesional') && (
            <Grid item xs={12}>
                <DailyAppointmentsTable />
            </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default Dashboard;
