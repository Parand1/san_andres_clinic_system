import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../AuthContext';

const AntecedentsForm = forwardRef(({ patientId, onDataChange, readOnly = false }, ref) => {
  const { token } = useAuth();
  const [formState, setFormState] = useState({
    personales: '',
    familiares: '',
    quirurgicos: '',
    alergicos: '',
    farmacologicos: '',
    otros: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAntecedents = async () => {
      if (!patientId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`/api/antecedents/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setFormState(data);
        } else if (response.status !== 404) {
          setError(data.msg || 'Error al cargar antecedentes.');
        }
      } catch (err) {
        setError('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };
    fetchAntecedents();
  }, [patientId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newState = { ...formState, [name]: value };
    setFormState(newState);
    if (onDataChange) {
      onDataChange(newState);
    }
  };

  useImperativeHandle(ref, () => ({
    save: async (currentPatientId) => {
      if (readOnly) return;

      const url = `/api/antecedents/${currentPatientId}`;
      const method = 'POST'; // La ruta del backend maneja la lógica de crear o actualizar

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
          throw new Error(data.msg || 'Error al guardar los antecedentes.');
        }
        return data;
      } catch (err) {
        console.error('Error saving antecedents:', err);
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
        name="personales"
        label="Antecedentes Personales"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.personales || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
       <TextField
        margin="dense"
        name="familiares"
        label="Antecedentes Familiares"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.familiares || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
      <TextField
        margin="dense"
        name="quirurgicos"
        label="Antecedentes Quirúrgicos"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.quirurgicos || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
      <TextField
        margin="dense"
        name="alergicos"
        label="Antecedentes Alérgicos"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.alergicos || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
      <TextField
        margin="dense"
        name="farmacologicos"
        label="Antecedentes Farmacológicos"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.farmacologicos || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
      <TextField
        margin="dense"
        name="otros"
        label="Otros Antecedentes"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={formState.otros || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputProps={{
          readOnly: readOnly,
        }}
      />
    </Box>
  );
});

export default AntecedentsForm;

