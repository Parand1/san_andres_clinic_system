import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Alert, CircularProgress, Button, Paper } from '@mui/material'; // Added Paper
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useAuth } from '../AuthContext';
import AppointmentDialog from './AppointmentDialog';
import AddIcon from '@mui/icons-material/Add'; // Icono para el botón

const getEventColor = (estado) => {
    switch(estado) {
        case 'Programada': return '#42a5f5'; // Azul suave
        case 'Confirmada': return '#00A79D'; // Turquesa (Primary)
        case 'Pagada': return '#66bb6a';     // Verde suave
        case 'En Sala de Espera': return '#ab47bc'; // Morado claro
        case 'Atendiendo': return '#ffa726'; // Naranja
        case 'Completada': return '#bdbdbd'; // Gris
        case 'Cancelada': return '#ef5350';  // Rojo
        default: return '#42a5f5';
    }
};

function AppointmentCalendar() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [dialogKey, setDialogKey] = useState(0);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/citas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        // Mapeamos y asignamos colores
        const styledEvents = data.map(apt => ({
            ...apt,
            backgroundColor: getEventColor(apt.estado_cita),
            borderColor: getEventColor(apt.estado_cita),
            textColor: '#fff' // Texto blanco para contraste
        }));
        setEvents(styledEvents);
      } else {
        setError(data.msg || 'Error al cargar las citas.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAppointments();
    }
  }, [token, fetchAppointments]);

  const handleEventClick = (clickInfo) => {
    const appointment = {
      id: clickInfo.event.id,
      start: clickInfo.event.start,
      end: clickInfo.event.end,
      ...clickInfo.event.extendedProps
    };
    setSelectedAppointment(appointment);
    setDialogKey(prevKey => prevKey + 1);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleAppointmentSave = async (appointmentData) => {
    const isNew = !appointmentData.id;
    const url = isNew ? '/api/citas' : `/api/citas/${appointmentData.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Error al guardar la cita.');
      }

      handleDialogClose();
      fetchAppointments(); // Recargar citas

    } catch (err) {
      console.error("Error guardando la cita:", err);
      setError(err.message); 
    }
  };

  const handleAppointmentDelete = async (appointmentId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta cita?')) {
      return;
    }
    try {
      const response = await fetch(`/api/citas/${appointmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Error al eliminar la cita.');
      }
      setSuccess(data.msg || 'Cita eliminada exitosamente.');
      handleDialogClose();
      fetchAppointments(); // Recargar citas
    } catch (err) {
      console.error("Error eliminando la cita:", err);
      setError(err.message);
    }
  };

  const handleNewAppointment = () => {
    setSelectedAppointment(null);
    setDialogKey(prevKey => prevKey + 1);
    setDialogOpen(true);
  };

  if (loading) {
    return <CircularProgress sx={{ m: 4 }} />;
  }

  return (
    <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="text.secondary">
                Agenda Médica
            </Typography>
            <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={handleNewAppointment}
                sx={{ borderRadius: 2, px: 3, py: 1 }}
            >
                Nueva Cita
            </Button>
        </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper elevation={3} sx={{ p: 2, borderRadius: 3, overflow: 'hidden' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            eventClick={handleEventClick}
            locale={esLocale}
            editable={true}
            droppable={true}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:20:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            eventOverlap={false}
            allDaySlot={false}
            height="auto" // Ajuste de altura automática
            contentHeight={600}
          />
      </Paper>

      {dialogOpen && (
        <AppointmentDialog
          key={dialogKey}
          open={dialogOpen}
          onClose={handleDialogClose}
          onSave={handleAppointmentSave}
          onDelete={handleAppointmentDelete}
          appointmentData={selectedAppointment}
        />
      )}
    </Box>
  );
}

export default AppointmentCalendar;
