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
  Autocomplete
} from '@mui/material';
import { useAuth } from '../AuthContext';

function AppointmentDialog({ open, onClose, onSave, appointmentData }) {
  const { token } = useAuth();
  const [formState, setFormState] = useState({});
  const [error, setError] = useState('');

  // Estados para los selectores y autocompletadores
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Cargar datos iniciales para los selectores
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Cargar profesionales
        const profsResponse = await fetch('/api/professionals', { headers: { Authorization: `Bearer ${token}` } });
        const profsData = await profsResponse.json();
        if (profsResponse.ok) setProfessionals(profsData);

        // Lógica de búsqueda de pacientes se activará con el input del usuario
      } catch (err) {
        setError('No se pudo cargar la información inicial.');
      }
    };
    if (open) {
      fetchInitialData();
    }
  }, [open, token]);

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
      setFormState({
        paciente_id: appointmentData.paciente_id || '',
        profesional_id: appointmentData.profesional_id || '',
        fecha_hora_inicio: appointmentData.start ? new Date(appointmentData.start).toISOString().slice(0, 16) : '',
        fecha_hora_fin: appointmentData.end ? new Date(appointmentData.end).toISOString().slice(0, 16) : '',
        tipo_atencion: appointmentData.tipo_atencion || 'Primera Vez',
        notas_secretaria: appointmentData.notas_secretaria || ''
      });
    } else {
      setFormState({}); // Resetear para una nueva cita
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
          options={patients}
          getOptionLabel={(option) => `${option.nombre} ${option.apellido} (${option.cedula})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(event, newValue) => {
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
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSaveClick} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default AppointmentDialog;
