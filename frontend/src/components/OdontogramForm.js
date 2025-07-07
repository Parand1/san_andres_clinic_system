import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip, // Importar Chip
  ListSubheader, // Importar ListSubheader
} from '@mui/material';
import { useAuth } from '../AuthContext';

// Mover estas definiciones fuera del componente Tooth para que sean accesibles globalmente
const surfaces = ['occlusal', 'distal', 'mesial', 'lingual', 'buccal']; // Ejemplo de superficies
const conditions = ['Caries', 'Restauración', 'Fractura', 'Ausente', 'Extracción', 'Sellante']; // Ejemplo de condiciones

// Helper para generar la numeración de dientes (FDI)
const generateToothNumbers = (type = 'permanente') => {
  const teeth = [];
  if (type === 'permanente') {
    // Cuadrantes 1, 2, 3, 4
    for (let i = 1; i <= 4; i++) {
      for (let j = 1; j <= 8; j++) {
        teeth.push({ numero: `${i}${j}`, tipo: 'permanente' });
      }
    }
  } else { // Deciduo
    // Cuadrantes 5, 6, 7, 8
    for (let i = 5; i <= 8; i++) {
      for (let j = 1; j <= 5; j++) {
        teeth.push({ numero: `${i}${j}`, tipo: 'deciduo' });
      }
    }
  }
  return teeth;
};

// Componente para representar un solo diente
const Tooth = ({ tooth, selected, onClick, onConditionChange }) => {
  return (
    <Paper
      elevation={selected ? 6 : 2}
      sx={{
        width: 80,
        height: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        border: selected ? '2px solid blue' : '1px solid #ccc',
        backgroundColor: selected ? '#e3f2fd' : '#fff',
        '&:hover': {
          backgroundColor: '#f0f0f0',
        },
      }}
      onClick={() => onClick(tooth)}
    >
      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
        {tooth.numero}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
        {tooth.estado_general || 'Sano'}
      </Typography>
      {selected && (
        <Box sx={{ mt: 1, width: '100%', px: 0.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Superficie</InputLabel>
            <Select
              label="Superficie"
              onChange={(e) => onConditionChange(tooth.numero, e.target.value, 'add')}
              value="" // Resetear después de seleccionar
            >
              {surfaces.map((s) => (
                <MenuItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Aquí se podría añadir un selector de condiciones para la superficie seleccionada */}
        </Box>
      )}
    </Paper>
  );
};

function OdontogramForm({ attentionId, onDataChange, readOnly = false }, ref) {
  const { token } = useAuth();
  const [odontogramState, setOdontogramState] = useState({
    observaciones_generales: '',
    dientes: [], // Array de objetos de diente
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Estado para mensajes de éxito
  const [odontogramExists, setOdontogramExists] = useState(false); // Nuevo estado
  const [selectedTooth, setSelectedTooth] = useState(null); // Diente seleccionado para detalle/edición

  // Fetch existing odontogram if attentionId is provided
  useEffect(() => {
    const fetchOdontogram = async () => {
      if (!attentionId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/odontogram/${attentionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setOdontogramState({
            observaciones_generales: data.observaciones_generales || '',
            dientes: data.dientes || [],
          });
          setOdontogramExists(true); // El odontograma existe
        } else if (response.status === 404) {
          // No existing odontogram, initialize with empty teeth
          setOdontogramState({
            observaciones_generales: '',
            dientes: generateToothNumbers('permanente').map(t => ({
              ...t,
              estado_general: 'sano',
              condiciones_superficies: {},
              observaciones_diente: '',
            })),
          });
          setOdontogramExists(false); // El odontograma no existe
        } else {
          setError(data.msg || 'Error al cargar odontograma.');
        }
      } catch (err) {
        console.error('Error de red:', err);
        setError('No se pudo conectar con el servidor para cargar odontograma.');
      } finally {
        setLoading(false);
      }
    };
    fetchOdontogram();
  }, [attentionId, token]);

  // Inicializar dientes si no hay odontograma existente
  useEffect(() => {
    if (!loading && !odontogramState.dientes.length && attentionId && !odontogramExists) {
      setOdontogramState(prev => ({
        ...prev,
        dientes: generateToothNumbers('permanente').map(t => ({
          ...t,
          estado_general: 'sano',
          condiciones_superficies: {},
          observaciones_diente: '',
        })),
      }));
    }
  }, [loading, odontogramState.dientes.length, attentionId, odontogramExists]);

  const handleToothClick = (tooth) => {
    setSelectedTooth(tooth);
  };

  const handleToothDataChange = (e) => {
    const { name, value } = e.target;
    setSelectedTooth(prev => ({ ...prev, [name]: value }));
    setOdontogramState(prev => ({
      ...prev,
      dientes: prev.dientes.map(d =>
        d.numero === selectedTooth.numero ? { ...d, [name]: value } : d
      ),
    }));
    onDataChange(odontogramState); // Notificar al padre
  };

  const handleSurfaceConditionChange = (toothNumber, surface, action, condition = null) => {
    setOdontogramState(prev => {
      const updatedDientes = prev.dientes.map(d => {
        if (d.numero === toothNumber) {
          const newConditions = { ...d.condiciones_superficies };
          if (action === 'add' && condition) {
            newConditions[surface] = newConditions[surface] ? [...newConditions[surface], condition] : [condition];
          } else if (action === 'remove' && condition) {
            newConditions[surface] = newConditions[surface]?.filter(c => c !== condition);
            if (newConditions[surface]?.length === 0) delete newConditions[surface];
          }
          return { ...d, condiciones_superficies: newConditions };
        }
        return d;
      });
      onDataChange({ ...prev, dientes: updatedDientes }); // Notificar al padre
      return { ...prev, dientes: updatedDientes };
    });
  };

  useImperativeHandle(ref, () => ({
    save: async (currentAttentionId) => {
      if (readOnly) return;

      let url;
      let method;
      const payload = {
        atencion_id: currentAttentionId,
        observaciones_generales: odontogramState.observaciones_generales,
        dientes: odontogramState.dientes.map(diente => ({
          numero_diente: diente.numero,
          tipo_diente: diente.tipo,
          estado_general: diente.estado_general,
          condiciones_superficies: diente.condiciones_superficies,
          observaciones_diente: diente.observaciones_diente,
        })),
      };

      if (odontogramExists) {
        url = `/api/odontogram/${currentAttentionId}`;
        method = 'PUT';
      } else {
        url = `/api/odontogram`;
        method = 'POST';
      }

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.msg || 'Error al guardar el odontograma.');
        }
        setOdontogramExists(true); // Marcar como existente después de un guardado exitoso
        return data;
      } catch (err) {
        console.error('Error saving odontogram:', err);
        throw err;
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
      <Typography variant="h5" gutterBottom>
        Odontograma
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TextField
        margin="dense"
        name="observaciones_generales"
        label="Observaciones Generales del Odontograma"
        type="text"
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        value={odontogramState.observaciones_generales}
        onChange={(e) => {
          setOdontogramState(prev => ({ ...prev, observaciones_generales: e.target.value }));
          onDataChange(odontogramState); // Notificar al padre
        }}
        sx={{ mb: 2 }}
      />

      <Grid container spacing={1} justifyContent="center">
        {generateToothNumbers('permanente').map((tooth) => (
          <Grid item key={tooth.numero}>
            <Tooth
              tooth={odontogramState.dientes.find(d => d.numero === tooth.numero) || tooth}
              selected={selectedTooth?.numero === tooth.numero}
              onClick={handleToothClick}
              onConditionChange={handleSurfaceConditionChange}
            />
          </Grid>
        ))}
      </Grid>

      {selectedTooth && (
        <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Detalle del Diente {selectedTooth.numero}
          </Typography>
          <FormControl fullWidth margin="dense">
            <InputLabel>Estado General</InputLabel>
            <Select
              name="estado_general"
              value={selectedTooth.estado_general || ''}
              onChange={handleToothDataChange}
              label="Estado General"
            >
              <MenuItem value="sano">Sano</MenuItem>
              <MenuItem value="caries">Caries</MenuItem>
              <MenuItem value="restauracion">Restauración</MenuItem>
              <MenuItem value="ausente">Ausente</MenuItem>
              <MenuItem value="erupcionando">Erupcionando</MenuItem>
              <MenuItem value="retenido">Retenido</MenuItem>
              <MenuItem value="fractura">Fractura</MenuItem>
              {/* Más estados */}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="observaciones_diente"
            label="Observaciones del Diente"
            type="text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={selectedTooth.observaciones_diente || ''}
            onChange={handleToothDataChange}
            sx={{ mt: 1 }}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Condiciones por Superficie:</Typography>
            {Object.entries(selectedTooth.condiciones_superficies || {}).map(([surface, conds]) => (
              <Box key={surface} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {surface.charAt(0).toUpperCase() + surface.slice(1)}:
                </Typography>
                {conds.map((cond) => (
                  <Chip
                    key={cond}
                    label={cond}
                    onDelete={() => handleSurfaceConditionChange(selectedTooth.numero, surface, 'remove', cond)}
                    sx={{ mr: 0.5 }}
                  />
                ))}
              </Box>
            ))}
            <FormControl fullWidth margin="dense">
              <InputLabel>Añadir Condición a Superficie</InputLabel>
              <Select
                value=""
                label="Añadir Condición a Superficie"
                onChange={(e) => {
                  const [surf, cond] = e.target.value.split('|');
                  if (surf && cond) handleSurfaceConditionChange(selectedTooth.numero, surf, 'add', cond);
                }}
              >
                {surfaces.map((s) => (
                  <ListSubheader key={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</ListSubheader>
                ))}
                {surfaces.flatMap(s => conditions.map(c => (
                  <MenuItem key={`${s}-${c}`} value={`${s}|${c}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}: {c}
                  </MenuItem>
                )))}
              </Select>
            </FormControl>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default forwardRef(OdontogramForm);