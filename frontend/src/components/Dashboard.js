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
  TextField,
  Card,
  CardContent,
  Avatar,
  useTheme,
  Tooltip
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventIcon from '@mui/icons-material/Event';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

import { useAuth } from '../AuthContext';
import PaymentDialog from './PaymentDialog';
import AddProcedureDialog from './AddProcedureDialog';

// Helper para formato YYYY-MM-DD
const formatDateForInput = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
};

// --- SUBCOMPONENTES VISUALES ---

function WelcomeHeader({ user }) {
    const theme = useTheme();
    
    return (
        <Paper 
            elevation={0} 
            sx={{ 
                p: 4, 
                mb: 4, 
                borderRadius: 4,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }}
        >
            <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WavingHandIcon sx={{ color: '#FFD700' }} /> ¡Hola, {user?.nombre}!
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
                    {user?.rol === 'profesional' 
                        ? 'Listo para cuidar de tus pacientes hoy.' 
                        : 'Administrando la excelencia en salud.'}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Chip label={user?.rol} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }} />
                    {user?.rol === 'profesional' && (
                        <Chip label={user.especialidades?.[0] || 'Medicina'} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                    )}
                </Box>
            </Box>
            <Avatar 
                sx={{ 
                    width: 100, 
                    height: 100, 
                    bgcolor: 'rgba(255,255,255,0.9)', 
                    color: theme.palette.primary.main,
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                    display: { xs: 'none', sm: 'flex' }
                }}
            >
                {user?.nombre?.[0]}{user?.apellido?.[0]}
            </Avatar>
        </Paper>
    );
}

function QuickActions({ user }) {
    return (
        <Grid container spacing={2} sx={{ mb: 4 }}>
            {(user.rol === 'secretaria' || user.rol === 'admin') && (
                <>
                    <Grid item xs={12} sm={4}>
                        <Button 
                            fullWidth 
                            variant="outlined" 
                            component={Link} 
                            to="/appointments"
                            startIcon={<EventIcon />}
                            sx={{ py: 2, borderRadius: 3, border: '2px solid', '&:hover': { borderWidth: '2px' } }}
                        >
                            Nueva Cita
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button 
                            fullWidth 
                            variant="outlined" 
                            component={Link} 
                            to="/patients"
                            startIcon={<PersonAddIcon />}
                            sx={{ py: 2, borderRadius: 3, border: '2px solid', '&:hover': { borderWidth: '2px' } }}
                        >
                            Nuevo Paciente
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button 
                            fullWidth 
                            variant="outlined" 
                            component={Link} 
                            to="/cashbox"
                            startIcon={<PointOfSaleIcon />}
                            sx={{ py: 2, borderRadius: 3, border: '2px solid', '&:hover': { borderWidth: '2px' } }}
                        >
                            Ver Caja
                        </Button>
                    </Grid>
                </>
            )}
        </Grid>
    );
}

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
        logout(); return;
      }

      const data = await response.json();
      if (response.ok) setAppointments(data);
      else setError(data.msg || 'Error al cargar citas.');
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAppointments();
  }, [token, user, selectedDate]);

  // Manejadores de Fecha
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
  const handleToday = () => { setSelectedDate(new Date()); };
  const handleOpenDatePicker = () => {
      setTempDate(formatDateForInput(selectedDate));
      setDatePickerOpen(true);
  };
  const handleConfirmDate = () => {
    if (tempDate) {
        const [year, month, day] = tempDate.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
    }
    setDatePickerOpen(false);
  };
  const formatDate = (date) => date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Manejadores de Acciones
  const handleUpdateState = async (id, newState) => {
    setError('');
    try {
        const response = await fetch(`/api/citas/${id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ nuevo_estado: newState }),
        });
        if (response.ok) fetchAppointments();
        else {
            const data = await response.json();
            setError(data.msg || 'Error al actualizar el estado.');
        }
    } catch (err) { setError('No se pudo conectar al servidor.'); }
  };

  const handleOpenPaymentDialog = (apt) => { setSelectedAppointment(apt); setPaymentDialogOpen(true); };
  const handleOpenProcedureDialog = (apt) => { setSelectedAppointment(apt); setProcedureDialogOpen(true); };
  const handleAttend = (apt, targetView = 'details') => { navigate('/attentions', { state: { appointmentData: apt, targetView } }); };

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
                items: paymentData.items.map(item => ({ descripcion: item.nombre, precio_unitario: item.precio, cantidad: item.cantidad })),
                metodo_pago: paymentData.metodo_pago,
                notas: paymentData.notas
            };
            const responsePago = await fetch('/api/pagos/adicional', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!responsePago.ok) throw new Error('Error al registrar pago inicial.');

            const responseCita = await fetch(`/api/citas/${selectedAppointment.id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nuevo_estado: 'Pagada' }),
            });
            if (!responseCita.ok) throw new Error('Error al actualizar estado de cita.');

            fetchAppointments();
            setPaymentDialogOpen(false);
        } catch (err) { setError(err.message); }
        return;
    }

    // Cobro deuda
    let pagoIdToProcess = paymentData.pagoId;
    if (!pagoIdToProcess) {
        // Búsqueda fallback
        try {
            const pagosResponse = await fetch(`/api/pagos?cita_id=${selectedAppointment.id}`, { headers: { Authorization: `Bearer ${token}` } });
            const pagos = await pagosResponse.json();
            const pagoPendiente = pagos.find(p => p.estado_pago === 'Pendiente');
            if (!pagoPendiente) { setError('No se encontró pago pendiente.'); return; }
            pagoIdToProcess = pagoPendiente.id;
        } catch(err) { setError('Error buscando pagos.'); return; }
    }

    try {
        const response = await fetch(`/api/pagos/${pagoIdToProcess}/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ metodo_pago: paymentData.metodo_pago, notas: paymentData.notas }),
        });
        if (response.ok) { fetchAppointments(); setPaymentDialogOpen(false); }
        else { const data = await response.json(); setError(data.msg); }
    } catch (err) { setError('Error de comunicación.'); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper elevation={2} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
        {/* HEADER DE LA TABLA */}
        <Box sx={{ 
            p: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            bgcolor: '#fafafa',
            borderBottom: '1px solid rgba(0,0,0,0.08)'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={handlePrevDay} size="small" sx={{ bgcolor: 'white', boxShadow: 1 }}>
                    <ChevronLeftIcon />
                </IconButton>
                
                <Typography variant="h6" sx={{ mx: 2, minWidth: 220, textTransform: 'capitalize', textAlign: 'center', fontWeight: 600, color: '#333' }}>
                    {formatDate(selectedDate)}
                </Typography>

                <IconButton onClick={handleNextDay} size="small" sx={{ bgcolor: 'white', boxShadow: 1 }}>
                    <ChevronRightIcon />
                </IconButton>
                
                <Button variant="text" size="small" startIcon={<TodayIcon />} onClick={handleToday} sx={{ ml: 2 }}>
                    Hoy
                </Button>
                <Tooltip title="Seleccionar fecha">
                    <IconButton size="small" onClick={handleOpenDatePicker} color="primary">
                        <CalendarMonthIcon />
                    </IconButton>
                </Tooltip>
            </Box>
            
            <Chip 
                icon={<EventIcon />} 
                label={`${appointments.length} Citas`} 
                color="primary" 
                variant="outlined" 
                sx={{ fontWeight: 'bold' }}
            />
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#fff' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#777' }}>HORA</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#777' }}>PACIENTE</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#777' }}>PROFESIONAL</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#777' }}>TIPO</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#777' }}>ESTADO</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#777' }}>ACCIONES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
                {appointments.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                            <Typography variant="body1" color="text.secondary">No hay citas para este día.</Typography>
                        </TableCell>
                    </TableRow>
                ) : (
                    appointments.map((apt) => (
                    <TableRow key={apt.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 600, color: '#333' }}>
                            {new Date(apt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>{apt.title}</TableCell>
                        <TableCell>Dr. {apt.profesional_apellido}</TableCell>
                        <TableCell>
                            <Chip label={apt.tipo_atencion} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 500 }} />
                        </TableCell>
                        <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                    label={apt.estado_cita} 
                                    size="small" 
                                    color={
                                        apt.estado_cita === 'Pagada' ? 'success' : 
                                        apt.estado_cita === 'Atendiendo' ? 'info' : 'default'
                                    } 
                                    variant={apt.estado_cita === 'Pagada' ? 'filled' : 'outlined'}
                                />
                                {apt.tiene_pagos_pendientes && (
                                    <Chip icon={<MonetizationOnIcon />} label="Deuda" size="small" color="error" />
                                )}
                            </Box>
                        </TableCell>
                        <TableCell>
                            {/* LÓGICA DE ACCIONES REFINADA */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {(user.rol === 'secretaria' || user.rol === 'admin') && apt.tiene_pagos_pendientes && (
                                    <Button size="small" variant="contained" color="error" onClick={() => handleOpenPaymentDialog(apt)}>Cobrar</Button>
                                )}
                                {(user.rol === 'secretaria' || user.rol === 'admin') && apt.estado_cita === 'Confirmada' && !apt.tiene_pagos_pendientes && (
                                    <Button size="small" variant="contained" color="success" onClick={() => handleOpenPaymentDialog(apt)}>Pagar</Button>
                                )}
                                {(user.rol === 'secretaria' || user.rol === 'admin') && apt.estado_cita === 'Programada' && (
                                    <Button size="small" variant="outlined" onClick={() => handleUpdateState(apt.id, 'Confirmada')}>Confirmar</Button>
                                )}
                                {(user.rol === 'secretaria' || user.rol === 'admin') && apt.estado_cita === 'Pagada' && (
                                    <Button size="small" variant="outlined" color="secondary" onClick={() => handleUpdateState(apt.id, 'En Sala de Espera')}>Check-In</Button>
                                )}
                                {(user.rol === 'profesional' || user.rol === 'admin') && apt.estado_cita === 'En Sala de Espera' && (
                                    <Button size="small" variant="contained" color="primary" onClick={() => handleAttend(apt)}>Atender</Button>
                                )}
                                {(user.rol === 'profesional' || user.rol === 'admin') && apt.estado_cita === 'Atendiendo' && (
                                    <>
                                        <Button size="small" variant="outlined" onClick={() => handleAttend(apt)}>Seguir</Button>
                                        <Tooltip title="Añadir Procedimiento">
                                            <IconButton size="small" color="secondary" onClick={() => handleOpenProcedureDialog(apt)}><PostAddIcon /></IconButton>
                                        </Tooltip>
                                        <Button size="small" variant="contained" color="warning" onClick={() => handleUpdateState(apt.id, 'Completada')}>Fin</Button>
                                    </>
                                )}
                                {(user.rol === 'profesional' || user.rol === 'admin') && apt.estado_cita === 'Completada' && (
                                    <Button size="small" variant="outlined" onClick={() => handleAttend(apt, 'history')}>Historial</Button>
                                )}
                            </Box>
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* DIÁLOGOS */}
        <Dialog open={datePickerOpen} onClose={() => setDatePickerOpen(false)}>
            <Box sx={{ p: 3, minWidth: 300 }}>
                <Typography variant="h6" gutterBottom>Ir a una fecha</Typography>
                <TextField type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} fullWidth autoFocus />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                    <Button onClick={() => setDatePickerOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleConfirmDate}>Ir</Button>
                </Box>
            </Box>
        </Dialog>
        
        {selectedAppointment && <PaymentDialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} onSave={handleSavePayment} appointment={selectedAppointment} />}
        {selectedAppointment && <AddProcedureDialog open={procedureDialogOpen} onClose={() => setProcedureDialogOpen(false)} appointment={selectedAppointment} onSaveSuccess={handleProcedureSaveSuccess} />}
    </Paper>
  );
}

// --- NUEVO COMPONENTE HEADER UNIFICADO ---
function DashboardHeader({ user }) {
    const theme = useTheme();
    const today = new Date();
    const dayName = today.toLocaleDateString('es-ES', { weekday: 'long' });
    const dayNumber = today.getDate();
    const monthName = today.toLocaleDateString('es-ES', { month: 'long' });
    const year = today.getFullYear();

    return (
        <Paper 
            elevation={3} 
            sx={{ 
                p: { xs: 2, md: 4 }, 
                mb: 4, 
                borderRadius: 4,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                color: 'white',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 3,
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Decoración de fondo sutil */}
            <Box sx={{ 
                position: 'absolute', 
                top: -50, left: -50, 
                width: 200, height: 200, 
                borderRadius: '50%', 
                bgcolor: 'rgba(255,255,255,0.1)' 
            }} />

            {/* SECCIÓN IZQUIERDA: BIENVENIDA */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, zIndex: 1, width: { xs: '100%', md: 'auto' } }}>
                <Avatar 
                    sx={{ 
                        width: { xs: 60, md: 90 }, 
                        height: { xs: 60, md: 90 }, 
                        bgcolor: 'rgba(255,255,255,0.95)', 
                        color: theme.palette.primary.main,
                        fontSize: { xs: '1.5rem', md: '2.5rem' },
                        fontWeight: 'bold',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                >
                    {user?.nombre?.[0]}{user?.apellido?.[0]}
                </Avatar>
                <Box>
                    <Typography variant="h4" fontWeight="800" sx={{ fontSize: { xs: '1.5rem', md: '2.2rem' } }}>
                        Hola, {user?.nombre}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.95, fontWeight: 500 }}>
                        {user?.rol === 'profesional' 
                            ? 'Que tengas una excelente jornada clínica.' 
                            : 'Bienvenido al panel de gestión administrativa.'}
                    </Typography>
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                        <Chip 
                            label={user?.rol?.toUpperCase()} 
                            size="small" 
                            sx={{ bgcolor: 'rgba(0,0,0,0.2)', color: 'white', fontWeight: 'bold', letterSpacing: 1 }} 
                        />
                    </Box>
                </Box>
            </Box>

            {/* SECCIÓN DERECHA: WIDGET DE FECHA INTEGRADO */}
            <Box sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)', 
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                p: 2,
                minWidth: 180,
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 2, opacity: 0.9 }}>
                    {dayName}
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 900, lineHeight: 1, my: 0.5, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                    {dayNumber}
                </Typography>
                <Typography variant="h6" sx={{ textTransform: 'capitalize', fontWeight: 400 }}>
                    {monthName} {year}
                </Typography>
            </Box>
        </Paper>
    );
}

// --- COMPONENTE PRINCIPAL DASHBOARD ---

function Dashboard() {
  const { user } = useAuth();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      {/* 1. ENCABEZADO UNIFICADO (FULL WIDTH) */}
      <DashboardHeader user={user} />

      {/* 2. ACCIONES RÁPIDAS */}
      <QuickActions user={user} />

      {/* 3. AGENDA OPERATIVA (FULL WIDTH) */}
      <Grid container spacing={4}>
        <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 0, bgcolor: 'transparent' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#444' }}>
                        Agenda Operativa
                    </Typography>
                </Box>
                <DailyAppointmentsTable />
            </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;