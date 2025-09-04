import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Autocomplete,
  Box
} from '@mui/material';
import { useAuth } from '../AuthContext';

function AppointmentDialog({ open, onClose, onSave, onDelete, appointmentData }) {
  const { token } = useAuth();
  const [formState, setFormState] = useState({});
  const [error, setError] = useState('');

  // Estados para los selectores y autocompletadores
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Cargar datos iniciales para los selectores
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Cargar profesionales
        const profsResponse = await fetch('/api/professionals', { headers: { Authorization: `Bearer ${token}` } });
        const profsData = await profsResponse.json();
        if (profsResponse.ok) setProfessionals(profsData);

        // Si estamos editando, cargar los datos del paciente existente
        if (appointmentData && appointmentData.paciente_id) {
          const patientResponse = await fetch(`/api/patients/${appointmentData.paciente_id}`, { headers: { Authorization: `Bearer ${token}` } });
          const patientData = await patientResponse.json();
          if (patientResponse.ok) {
            setPatients([patientData]);
            setSelectedPatient(patientData);
          }
        }

      } catch (err) {
        setError('No se pudo cargar la información inicial.');
      }
    };
    if (open) {
      fetchInitialData();
    }
  }, [open, token, appointmentData]);

  // Cargar pacientes según el término de búsqueda
  useEffect(() => {
    const timerId = setTimeout(async () => {
      if (patientSearchTerm.length > 2) {
        try {
          const response = await fetch(`/api/patients?search=${encodeURIComponent(patientSearchTerm)}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await response.json();
          if (response.ok) setPatients(data);
        } catch (err) {
          console.error('Error buscando pacientes:', err);
        }
      }
    }, 500);
    return () => clearTimeout(timerId);
  }, [patientSearchTerm, token]);

  // Sincronizar estado del formulario con los datos de la cita a editar
  useEffect(() => {
    if (appointmentData) {
      // Función para formatear la fecha en el formato que espera el input datetime-local
      const formatDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Ajustar por la zona horaria local para evitar que UTC cambie el día
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - timezoneOffset);
        return localDate.toISOString().slice(0, 16);
      };

      setFormState({
        id: appointmentData.id,
        paciente_id: appointmentData.paciente_id || '',
        profesional_id: appointmentData.profesional_id || '',
        fecha_hora_inicio: formatDateTimeLocal(appointmentData.start),
        fecha_hora_fin: formatDateTimeLocal(appointmentData.end),
        tipo_atencion: appointmentData.tipo_atencion || 'Primera Vez',
        notas_secretaria: appointmentData.notas_secretaria || ''
      });
    } else {
      setFormState({}); // Resetear para una nueva cita
      setSelectedPatient(null);
      setPatients([]);
    }
  }, [appointmentData]);

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSaveClick = () => {
    // Validaciones básicas
    if (!formState.paciente_id || !formState.profesional_id || !formState.fecha_hora_inicio || !formState.fecha_hora_fin) {
        setError('Paciente, Profesional y las fechas son campos requeridos.');
        return;
    }
    onSave(formState);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{appointmentData ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Autocomplete
          value={selectedPatient}
          options={patients}
          getOptionLabel={(option) => `${option.nombre} ${option.apellido} (${option.cedula})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(event, newValue) => {
            setSelectedPatient(newValue);
            setFormState({ ...formState, paciente_id: newValue ? newValue.id : '' });
          }}
          onInputChange={(event, newInputValue) => {
            setPatientSearchTerm(newInputValue);
          }}
          renderInput={(params) => (
            <TextField {...params} label="Buscar Paciente" margin="dense" fullWidth required />
          )}
        />

        <FormControl fullWidth margin="dense" required>
          <InputLabel>Profesional</InputLabel>
          <Select name="profesional_id" value={formState.profesional_id || ''} onChange={handleChange}>
            {professionals.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre} {p.apellido}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField
          label="Inicio de la Cita"
          type="datetime-local"
          name="fecha_hora_inicio"
          value={formState.fecha_hora_inicio || ''}
          onChange={handleChange}
          fullWidth
          margin="dense"
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          label="Fin de la Cita"
          type="datetime-local"
          name="fecha_hora_fin"
          value={formState.fecha_hora_fin || ''}
          onChange={handleChange}
          fullWidth
          margin="dense"
          InputLabelProps={{ shrink: true }}
          required
        />

        <FormControl fullWidth margin="dense">
          <InputLabel>Tipo de Atención</InputLabel>
          <Select name="tipo_atencion" value={formState.tipo_atencion || ''} onChange={handleChange}>
            <MenuItem value="Primera Vez">Primera Vez</MenuItem>
            <MenuItem value="Subsecuente">Subsecuente</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Notas Adicionales"
          name="notas_secretaria"
          value={formState.notas_secretaria || ''}
          onChange={handleChange}
          fullWidth
          multiline
          rows={3}
          margin="dense"
        />

      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Box>
            {appointmentData && (
                <Button onClick={() => onDelete(appointmentData.id)} color="error">
                    Eliminar
                </Button>
            )}
        </Box>
        <Box>
            <Button onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSaveClick} variant="contained">Guardar</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default AppointmentDialog;
