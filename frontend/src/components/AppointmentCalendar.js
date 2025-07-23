import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../AuthContext';

// En el futuro, integraremos una librería de calendario completa como FullCalendar.
// Por ahora, este componente servirá como marcador de posición y para obtener los datos.

function AppointmentCalendar() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        // Por ahora, obtenemos las citas del último mes como ejemplo
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const response = await fetch(`/api/citas?fecha_inicio=${startDate.toISOString()}&fecha_fin=${endDate.toISOString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (response.ok) {
          setEvents(data);
        } else {
          setError(data.msg || 'Error al cargar las citas.');
        }
      } catch (err) {
        setError('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAppointments();
    }
  }, [token]);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Calendario de Citas
      </Typography>
      <Box sx={{ border: '1px dashed grey', p: 2, minHeight: 400 }}>
        <Typography variant="h6">Próximamente: Calendario Interactivo</Typography>
        <Typography sx={{ mt: 2 }}>
          Aquí se mostrará el calendario de citas. Por ahora, hemos cargado {events.length} eventos desde el backend.
        </Typography>
        {/* Aquí iría el componente de calendario, por ejemplo <FullCalendar ... /> */}
      </Box>
    </Box>
  );
}

export default AppointmentCalendar;
