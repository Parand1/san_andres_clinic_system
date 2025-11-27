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
  Alert,
  IconButton,
  Dialog,
  TextField
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuth } from '../AuthContext';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PaymentDialog from './PaymentDialog';
import AddProcedureDialog from './AddProcedureDialog';

const motivationalQuotes = [
  "La buena medicina es la que actúa menos sobre los síntomas que sobre sus causas.",
  "El arte de la medicina es animar al paciente mientras la naturaleza lo cura.",
  "Donde quiera que se ame el arte de la medicina, se ama también a la humanidad.",
];

// Helper para formato YYYY-MM-DD en el input date
const formatDateForInput = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

function DailyAppointmentsTable() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState('');

  const fetchAppointments = async () => {
    const dateStart = new Date(selectedDate);
    dateStart.setHours(0, 0, 0, 0);
    
    const dateEnd = new Date(selectedDate);
    dateEnd.setHours(23, 59, 59, 999);
    
    const startDateIso = dateStart.toISOString();
    const endDateIso = dateEnd.toISOString();
    
    let url = `/api/citas?fecha_inicio=${startDateIso}&fecha_fin=${endDateIso}`;
    if (user.rol === 'profesional') {
      url += `&profesional_id=${user.id}`;
    }

    try {
      setLoading(true);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      
      if (response.status === 403) {
        logout();
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setAppointments(data);
      } else {
        setError(data.msg || 'Error al cargar citas.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAppointments();
    }
  }, [token, user, selectedDate]);

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleOpenDatePicker = () => {
      setTempDate(formatDateForInput(selectedDate));
      setDatePickerOpen(true);
  };

  const handleConfirmDate = () => {
    if (tempDate) {
        const [year, month, day] = tempDate.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        setSelectedDate(newDate);
    }
    setDatePickerOpen(false);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

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
            console.error("Error detallado del servidor:", data);
            setError(data.msg || 'Error al actualizar el estado.');
        }
    } catch (err) {
        console.error("Error de red:", err);
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

  const handleOpenProcedureDialog = (appointment) => {
    setSelectedAppointment(appointment);
    setProcedureDialogOpen(true);
  };

  const handleCloseProcedureDialog = () => {
    setSelectedAppointment(null);
    setProcedureDialogOpen(false);
  };

  const handleProcedureSaveSuccess = () => {
    fetchAppointments();
  };

  const handleSavePayment = async (paymentData) => {
    setError('');
    if (!selectedAppointment) return;

    if (paymentData.isInitial) {
        try {
            const payload = {
                cita_id: selectedAppointment.id,
                paciente_id: selectedAppointment.paciente_id,
                items: paymentData.items.map(item => ({
                    descripcion: item.nombre,
                    precio_unitario: item.precio,
                    cantidad: item.cantidad
                })),
                metodo_pago: paymentData.metodo_pago,
                notas: paymentData.notas
            };

            const responsePago = await fetch('/api/pagos/adicional', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!responsePago.ok) {
                const data = await responsePago.json();
                throw new Error(data.msg || 'Error al registrar el pago inicial.');
            }

            const responseCita = await fetch(`/api/citas/${selectedAppointment.id}/estado`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ nuevo_estado: 'Pagada' }),
            });

            if (!responseCita.ok) {
                throw new Error('Pago registrado, pero error al actualizar estado de la cita.');
            }

            fetchAppointments();
            handleClosePaymentDialog();

        } catch (err) {
            setError(err.message || 'Error de comunicación.');
        }
        return;
    }

    let pagoIdToProcess = paymentData.pagoId;

    if (!pagoIdToProcess) {
        try {
            const pagosResponse = await fetch(`/api/pagos?cita_id=${selectedAppointment.id}`, { headers: { Authorization: `Bearer ${token}` } });
            const pagos = await pagosResponse.json();
            const pagoPendiente = pagos.find(p => p.estado_pago === 'Pendiente');

            if (!pagoPendiente) {
                setError('No se encontró un pago pendiente para esta cita.');
                return;
            }
            pagoIdToProcess = pagoPendiente.id;
        } catch (err) {
             setError('Error al buscar pagos pendientes.');
             return;
        }
    }

    try {
        const response = await fetch(`/api/pagos/${pagoIdToProcess}/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                metodo_pago: paymentData.metodo_pago,
                notas: paymentData.notas
            }),
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

  const handleAttend = (appointment, targetView = 'details') => {
    navigate('/attentions', { state: { appointmentData: appointment, targetView } });
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Box sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #ddd'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={handlePrevDay}>
                    <ChevronLeftIcon />
                </IconButton>
                
                <Typography variant="h6" sx={{ mx: 2, minWidth: 200, textTransform: 'capitalize', textAlign: 'center' }}>
                    {formatDate(selectedDate)}
                </Typography>

                <IconButton onClick={handleNextDay}>
                    <ChevronRightIcon />
                </IconButton>
                
                <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<TodayIcon />} 
                    onClick={handleToday}
                    sx={{ ml: 2 }}
                >
                    Hoy
                </Button>
                <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<CalendarMonthIcon />} 
                    onClick={handleOpenDatePicker}
                    sx={{ ml: 1 }}
                >
                    Elegir Fecha
                </Button>
            </Box>
            <Typography variant="h6" color="text.secondary">
                Citas
            </Typography>
        </Box>

        {/* DIÁLOGO SELECTOR DE FECHA */}
        <Dialog open={datePickerOpen} onClose={() => setDatePickerOpen(false)}>
            <Box sx={{ p: 3, minWidth: 300 }}>
                <Typography variant="h6" gutterBottom>Ir a una fecha específica</Typography>
                <TextField
                    type="date"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    fullWidth
                    autoFocus
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                    <Button onClick={() => setDatePickerOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleConfirmDate}>Aceptar</Button>
                </Box>
            </Box>
        </Dialog>

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
            {appointments.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography variant="body1" color="text.secondary">
                            No hay citas programadas para este día.
                        </Typography>
                    </TableCell>
                </TableRow>
            ) : (
                appointments.map((apt) => (
                <TableRow key={apt.id}>
                    <TableCell>{new Date(apt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{apt.title}</TableCell>
                    <TableCell>{`${apt.profesional_nombre} ${apt.profesional_apellido}`}</TableCell>
                    <TableCell>{apt.tipo_atencion}</TableCell>
                    <TableCell>
                    <Chip 
                        label={apt.estado_cita} 
                        size="small" 
                        color={
                        apt.estado_cita === 'Pagada' ? 'success' : 
                        apt.estado_cita === 'Atendiendo' ? 'info' :
                        apt.estado_cita === 'Completada' ? 'default' : 'default'
                        } 
                    />
                    {apt.tiene_pagos_pendientes && (
                        <Chip 
                        icon={<MonetizationOnIcon />}
                        label="Saldo Pendiente"
                        size="small"
                        color="error"
                        sx={{ ml: 1 }}
                        />
                    )}
                    </TableCell>
                    <TableCell>
                    {(user.rol === 'secretaria' || user.rol === 'admin') && apt.tiene_pagos_pendientes && (
                        <Button size="small" variant="contained" color="error" onClick={() => handleOpenPaymentDialog(apt)} sx={{ mr: 1 }}>Cobrar Saldo</Button>
                    )}
                    {(user.rol === 'secretaria' || user.rol === 'admin') && apt.estado_cita === 'Confirmada' && !apt.tiene_pagos_pendientes && (
                        <Button size="small" variant="contained" color="success" onClick={() => handleOpenPaymentDialog(apt)}>Registrar Pago</Button>
                    )}
                    {(user.rol === 'secretaria' || user.rol === 'admin') && apt.estado_cita === 'Programada' && (
                        <Button size="small" onClick={() => handleUpdateState(apt.id, 'Confirmada')}>Confirmar</Button>
                    )}
                    {(user.rol === 'secretaria' || user.rol === 'admin') && apt.estado_cita === 'Pagada' && (
                        <Button size="small" onClick={() => handleUpdateState(apt.id, 'En Sala de Espera')}>Check-In</Button>
                    )}
                    {(user.rol === 'profesional' || user.rol === 'admin') && apt.estado_cita === 'En Sala de Espera' && (
                        <Button size="small" variant="contained" color="primary" onClick={() => handleAttend(apt)}>Atender</Button>
                    )}
                    {(user.rol === 'profesional' || user.rol === 'admin') && apt.estado_cita === 'Atendiendo' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Button size="small" variant="outlined" color="info" onClick={() => handleAttend(apt)}>Continuar Atención</Button>
                        <Button 
                            size="small" 
                            variant="outlined" 
                            color="secondary" 
                            startIcon={<PostAddIcon />}
                            onClick={() => handleOpenProcedureDialog(apt)}
                        >
                            Registrar Procedimiento
                        </Button>
                        <Button size="small" variant="contained" color="warning" onClick={() => handleUpdateState(apt.id, 'Completada')}>Finalizar Atención</Button>
                        </Box>
                    )}
                    {(user.rol === 'profesional' || user.rol === 'admin') && apt.estado_cita === 'Completada' && (
                        <Button size="small" variant="outlined" onClick={() => handleAttend(apt, 'history')}>Ver Historia</Button>
                    )}
                    </TableCell>
                </TableRow>
                ))
            )}
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

      {selectedAppointment && (
        <AddProcedureDialog
            open={procedureDialogOpen}
            onClose={handleCloseProcedureDialog}
            appointment={selectedAppointment}
            onSaveSuccess={handleProcedureSaveSuccess}
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

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="h5" component="p" color="primary" sx={{ textTransform: 'capitalize' }}>
              {dateString}
            </Typography>
            <MedicalServicesIcon sx={{ fontSize: 100, color: 'primary.main', mt: 2 }} />
          </Paper>
        </Grid>

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