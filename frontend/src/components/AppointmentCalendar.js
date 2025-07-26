import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Alert, CircularProgress, Button } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useAuth } from '../AuthContext';
import AppointmentDialog from './AppointmentDialog';

function AppointmentCalendar() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        const formattedEvents = data.map(cita => ({
          id: cita.cita_id,
          title: `${cita.paciente_nombre} ${cita.paciente_apellido}`,
          start: cita.fecha_hora,
          end: cita.fecha_hora_fin, // Asegurarse que el backend provee esto
          extendedProps: {
            ...cita
          }
        }));
        setEvents(formattedEvents);
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
    setSelectedAppointment(clickInfo.event.extendedProps);
    setDialogKey(prevKey => prevKey + 1);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleAppointmentSave = async (appointmentData) => {
    const isNew = !appointmentData.cita_id;
    const url = isNew ? '/api/citas' : `/api/citas/${appointmentData.cita_id}`;
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
      // Idealmente, este error se debería pasar al Dialog para mostrarlo
      console.error("Error guardando la cita:", err);
      setError(err.message); // Mostrar error a nivel de calendario
    }
  };

  const handleNewAppointment = () => {
    setSelectedAppointment(null);
    setDialogKey(prevKey => prevKey + 1);
    setDialogOpen(true);
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" gutterBottom>
                Calendario de Citas
            </Typography>
            <Button variant="contained" onClick={handleNewAppointment}>
                Agendar Nueva Cita
            </Button>
        </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

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
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
      />

      {dialogOpen && (
        <AppointmentDialog
          key={dialogKey}
          open={dialogOpen}
          onClose={handleDialogClose}
          onSave={handleAppointmentSave}
          appointmentData={selectedAppointment}
        />
      )}
    </Box>
  );
}

export default AppointmentCalendar;
