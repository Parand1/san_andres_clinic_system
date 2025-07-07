import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../AuthContext';

const MedicalHistoryDetailsForm = forwardRef(({ attentionId, onDataChange, readOnly = false }, ref) => {
  const { token } = useAuth();
  const [formState, setFormState] = useState({
    enfermedad_actual: '',
    revision_sistemas: '',
    examen_fisico: '',
    plan_diagnostico_terapeutico: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!attentionId) {
        setFormState({
          enfermedad_actual: '',
          revision_sistemas: '',
          examen_fisico: '',
          plan_diagnostico_terapeutico: '',
        });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`/api/medical-history/${attentionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setFormState(data);
        } else if (response.status !== 404) {
          setError(data.msg || 'Error al cargar detalles.');
        }
      } catch (err) {
        setError('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [attentionId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newState = { ...formState, [name]: value };
    setFormState(newState);
    if (onDataChange) {
      onDataChange(newState);
    }
  };

  useImperativeHandle(ref, () => ({
    save: async (currentAttentionId) => {
      if (readOnly) return;

      const url = `/api/medical-history/${currentAttentionId}`;
      const method = 'POST'; // Siempre es POST porque la ruta del backend maneja la lógica de crear o actualizar

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formState),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.msg || 'Error al guardar los detalles de la historia clínica.');
        }
        return data;
      } catch (err) {
        console.error('Error saving medical history details:', err);
        throw err;
      }
    },
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField
        margin="dense"
        name="enfermedad_actual"
        label="Enfermedad Actual"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.enfermedad_actual || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
      <TextField
        margin="dense"
        name="revision_sistemas"
        label="Revisión por Sistemas"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.revision_sistemas || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
      <TextField
        margin="dense"
        name="examen_fisico"
        label="Examen Físico"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.examen_fisico || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
      <TextField
        margin="dense"
        name="plan_diagnostico_terapeutico"
        label="Plan Diagnóstico y Terapéutico"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.plan_diagnostico_terapeutico || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
    </Box>
  );
});

export default MedicalHistoryDetailsForm;
