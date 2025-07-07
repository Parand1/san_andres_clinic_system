import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../AuthContext';

function DiagnosisManagement({ attentionId, readOnly, onDiagnosesChange }) { // Añadir readOnly y onDiagnosesChange
  const { token, user } = useAuth();
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null);
  const [formState, setFormState] = useState({
    cie10_id: '',
    tipo_diagnostico: '',
  });

  const [cie10Options, setCie10Options] = useState([]);
  const [cie10SearchTerm, setCie10SearchTerm] = useState('');
  const [selectedCie10, setSelectedCie10] = useState(null);

  // Debounce para la búsqueda de CIE-10
  useEffect(() => {
    const timerId = setTimeout(async () => {
      if (cie10SearchTerm.length > 2) {
        try {
          const response = await fetch(`/api/cie10?search=${encodeURIComponent(cie10SearchTerm)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (response.ok) {
            setCie10Options(data);
          } else {
            console.error('Error al buscar CIE-10:', data.msg);
          }
        } catch (err) {
          console.error('Error de red al buscar CIE-10:', err);
        }
      } else {
        setCie10Options([]);
      }
    }, 300);
    return () => clearTimeout(timerId);
  }, [cie10SearchTerm, token]);

  // Fetch de diagnósticos (si hay attentionId) o inicializar localmente
  useEffect(() => {
    const loadDiagnoses = async () => {
      if (attentionId) {
        setLoading(true);
        setError('');
        try {
          const response = await fetch(`/api/diagnostics?atencion_id=${attentionId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          if (response.ok) {
            setDiagnoses(data);
            onDiagnosesChange && onDiagnosesChange(data); // Notificar al padre
          } else {
            setError(data.msg || 'Error al cargar diagnósticos.');
          }
        } catch (err) {
          console.error('Error de red:', err);
          setError('No se pudo conectar con el servidor para cargar diagnósticos.');
        } finally {
          setLoading(false);
        }
      } else {
        // Modo de creación: gestionar diagnósticos localmente
        setDiagnoses([]);
        onDiagnosesChange && onDiagnosesChange([]); // Notificar al padre
        setLoading(false);
      }
    };
    if (token) { // Solo cargar si hay token
      loadDiagnoses();
    }
  }, [token, attentionId]); // Depende de attentionId y token

  const handleOpenAddDialog = () => {
    setCurrentDiagnosis(null);
    setFormState({
      cie10_id: '',
      tipo_diagnostico: '',
    });
    setSelectedCie10(null);
    setCie10SearchTerm('');
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (diagnosis) => {
    setCurrentDiagnosis(diagnosis);
    setFormState({
      cie10_id: diagnosis.cie10_id,
      tipo_diagnostico: diagnosis.tipo_diagnostico,
    });
    setSelectedCie10({ id: diagnosis.cie10_id, code: diagnosis.cie10_code, description: diagnosis.cie10_description });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSaveDiagnosis = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCie10) {
      setError('Por favor, seleccione un código CIE-10.');
      return;
    }

    const newDiagnosisData = {
      cie10_id: selectedCie10.id,
      tipo_diagnostico: formState.tipo_diagnostico,
      cie10_code: selectedCie10.code, // Añadir para visualización local
      cie10_description: selectedCie10.description, // Añadir para visualización local
    };

    if (attentionId) {
      // Si hay attentionId, guardar en el backend
      const method = currentDiagnosis ? 'PUT' : 'POST';
      const url = currentDiagnosis
        ? `/api/diagnostics/${currentDiagnosis.id}`
        : `/api/diagnostics/${attentionId}`;

      const payload = {
        atencion_id: attentionId,
        ...newDiagnosisData,
      };

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

        if (response.ok) {
          setSuccess(data.msg || 'Operación exitosa.');
          // Recargar diagnósticos del backend
          const updatedDiagnoses = await fetch(`/api/diagnostics?atencion_id=${attentionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.json());
          setDiagnoses(updatedDiagnoses);
          onDiagnosesChange && onDiagnosesChange(updatedDiagnoses);
          handleCloseDialog();
        } else {
          setError(data.msg || 'Error al guardar diagnóstico.');
        }
      } catch (err) {
        console.error('Error de red:', err);
        setError('No se pudo conectar con el servidor.');
      }
    } else {
      // Si no hay attentionId, gestionar localmente
      setDiagnoses((prevDiagnoses) => {
        let updatedDiagnoses;
        if (currentDiagnosis) {
          // Editar diagnóstico existente localmente
          updatedDiagnoses = prevDiagnoses.map((diag) =>
            diag.id === currentDiagnosis.id ? { ...diag, ...newDiagnosisData } : diag
          );
        } else {
          // Añadir nuevo diagnóstico localmente (usar un ID temporal)
          updatedDiagnoses = [...prevDiagnoses, { id: Date.now(), ...newDiagnosisData }];
        }
        onDiagnosesChange && onDiagnosesChange(updatedDiagnoses); // Notificar al padre
        return updatedDiagnoses;
      });
      setSuccess('Diagnóstico agregado/actualizado localmente.');
      handleCloseDialog();
    }
  };

  const handleDeleteDiagnosis = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este diagnóstico? Esta acción es irreversible.')) {
      return;
    }
    setError('');
    setSuccess('');

    if (attentionId) {
      // Si hay attentionId, eliminar del backend
      try {
        const response = await fetch(`/api/diagnostics/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setSuccess(data.msg || 'Diagnóstico eliminado exitosamente.');
          // Recargar diagnósticos del backend
          const updatedDiagnoses = await fetch(`/api/diagnostics?atencion_id=${attentionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.json());
          setDiagnoses(updatedDiagnoses);
          onDiagnosesChange && onDiagnosesChange(updatedDiagnoses);
        } else {
          setError(data.msg || 'Error al eliminar diagnóstico.');
        }
      } catch (err) {
        console.error('Error de red:', err);
        setError('No se pudo conectar con el servidor para eliminar.');
      }
    } else {
      // Si no hay attentionId, eliminar localmente
      setDiagnoses((prevDiagnoses) => {
        const updatedDiagnoses = prevDiagnoses.filter((diag) => diag.id !== id);
        onDiagnosesChange && onDiagnosesChange(updatedDiagnoses); // Notificar al padre
        return updatedDiagnoses;
      });
      setSuccess('Diagnóstico eliminado localmente.');
    }
  };

  if (loading && attentionId) { // Solo mostrar cargando si hay attentionId
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>Cargando diagnósticos...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        Diagnósticos
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {!readOnly && ( // Botón solo visible si no es solo lectura
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          sx={{ mb: 2 }}
        >
          Agregar Diagnóstico
        </Button>
      )}

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="diagnoses table">
          <TableHead>
            <TableRow>
              <TableCell>Código CIE-10</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Tipo</TableCell>
              {user && user.rol === 'admin' && (
                <>
                  <TableCell>Creado por</TableCell>
                  <TableCell>Última Modificación</TableCell>
                </>
              )}
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {diagnoses.map((diagnosis) => (
              <TableRow
                key={diagnosis.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>{diagnosis.cie10_code}</TableCell>
                <TableCell>{diagnosis.cie10_description}</TableCell>
                <TableCell>{diagnosis.tipo_diagnostico}</TableCell>
                {user && user.rol === 'admin' && (
                  <>
                    <TableCell>
                      {diagnosis.created_by_nombre && diagnosis.created_by_apellido
                        ? `${diagnosis.created_by_nombre} ${diagnosis.created_by_apellido}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {diagnosis.updated_at
                        ? `${new Date(diagnosis.updated_at).toLocaleDateString()} ${new Date(diagnosis.updated_at).toLocaleTimeString()}`
                        : 'N/A'}
                      {diagnosis.updated_by_nombre && diagnosis.updated_by_apellido
                        ? ` por ${diagnosis.updated_by_nombre} ${diagnosis.updated_by_apellido}`
                        : ''}
                    </TableCell>
                  </>
                )}
                <TableCell>
                  {!readOnly && ( // Botones de acción solo si no es solo lectura
                    <>
                      {/* Solo el creador o un admin pueden editar */}
                      {(user && user.rol === 'admin') || (user && user.id === diagnosis.created_by_professional_id) ? (
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenEditDialog(diagnosis)}
                        >
                          <EditIcon />
                        </IconButton>
                      ) : (
                        <IconButton color="primary" disabled>
                          <EditIcon />
                        </IconButton>
                      )}
                      {/* Solo admin puede eliminar */}
                      {user && user.rol === 'admin' && (
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteDiagnosis(diagnosis.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para Agregar/Editar Diagnóstico */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{currentDiagnosis ? 'Editar Diagnóstico' : 'Agregar Diagnóstico'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Autocomplete
            options={cie10Options}
            getOptionLabel={(option) => `${option.code} - ${option.description}`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={selectedCie10}
            onChange={(event, newValue) => {
              setSelectedCie10(newValue);
            }}
            onInputChange={(event, newInputValue) => {
              setCie10SearchTerm(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="dense"
                label="Buscar Código CIE-10"
                variant="outlined"
                fullWidth
                required
              />
            )}
            sx={{ mt: 1 }}
          />
          <FormControl fullWidth margin="dense" required>
            <InputLabel id="tipo-diagnostico-label">Tipo de Diagnóstico</InputLabel>
            <Select
              labelId="tipo-diagnostico-label"
              id="tipo_diagnostico"
              name="tipo_diagnostico"
              value={formState.tipo_diagnostico}
              label="Tipo de Diagnóstico"
              onChange={handleChange}
            >
              <MenuItem value="">
                <em>Seleccionar Tipo</em>
              </MenuItem>
              <MenuItem value="presuntivo">Presuntivo</MenuItem>
              <MenuItem value="definitivo">Definitivo</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveDiagnosis} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default forwardRef(DiagnosisManagement);