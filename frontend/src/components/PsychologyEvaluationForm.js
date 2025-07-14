import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../AuthContext';

const PsychologyEvaluationForm = forwardRef(({ attentionId, onSaveSuccess, onDataChange }, ref) => {
  const { token, user } = useAuth();
  const [formState, setFormState] = useState({
    motivo_consulta_psicologia: '',
    historia_psicologica: '',
    evaluacion_mental: '',
    impresion_diagnostica: '',
    plan_intervencion: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch existing evaluation if attentionId is provided (for editing)
  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!attentionId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/psychology/${attentionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setFormState({
            motivo_consulta_psicologia: data.motivo_consulta_psicologia || '',
            historia_psicologica: data.historia_psicologica || '',
            evaluacion_mental: data.evaluacion_mental || '',
            impresion_diagnostica: data.impresion_diagnostica || '',
            plan_intervencion: data.plan_intervencion || '',
          });
        } else if (response.status === 404) {
          // No existing evaluation, treat as new
          setFormState({
            motivo_consulta_psicologia: '',
            historia_psicologica: '',
            evaluacion_mental: '',
            impresion_diagnostica: '',
            plan_intervencion: '',
          });
        } else {
          setError(data.msg || 'Error al cargar evaluación de psicología.');
        }
      } catch (err) {
        console.error('Error de red:', err);
        setError('No se pudo conectar con el servidor para cargar evaluación de psicología.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvaluation();
  }, [attentionId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    onDataChange({ ...formState, [name]: value }); // Notificar al padre sobre el cambio
  };

  // Exponer la función de guardado al componente padre
  useImperativeHandle(ref, () => ({
    save: async (currentAttentionId) => {
      setError('');
      setSuccess('');
      try {
        const method = currentAttentionId ? 'PUT' : 'POST';
        const url = currentAttentionId
          ? `/api/psychology/${currentAttentionId}`
          : '/api/psychology';

        const payload = {
          ...formState,
          attention_id: currentAttentionId,
        };

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.msg || 'Error al guardar la evaluación de psicología.');
        }
        // NO ACTUALIZAR ESTADO AQUÍ. El componente está a punto de ser desmontado.
        return { success: true };
      } catch (err) {
        console.error('Error al guardar evaluación de psicología:', err);
        setError(err.message || 'Error de red al guardar evaluación de psicología.');
        return { success: false, error: err.message };
      }
    },
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Evaluación de Psicología
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TextField
        margin="dense"
        name="motivo_consulta_psicologia"
        label="Motivo de Consulta (Psicología)"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.motivo_consulta_psicologia}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />
      <TextField
        margin="dense"
        name="historia_psicologica"
        label="Historia Psicológica"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.historia_psicologica}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />
      <TextField
        margin="dense"
        name="evaluacion_mental"
        label="Evaluación del Estado Mental"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.evaluacion_mental}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />
      <TextField
        margin="dense"
        name="impresion_diagnostica"
        label="Impresión Diagnóstica (Psicología)"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.impresion_diagnostica}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />
      <TextField
        margin="dense"
        name="plan_intervencion"
        label="Plan de Intervención"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.plan_intervencion}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />
    </Box>
  );
});

export default PsychologyEvaluationForm;


