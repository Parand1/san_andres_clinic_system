import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../AuthContext';

function TarifarioManagement() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    tipo: 'Procedimiento',
    especialidad_id: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchItems();
    fetchSpecialties();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/tarifario?all=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setItems(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const response = await fetch('/api/specialties', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setSpecialties(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setFormData({
        nombre: item.nombre,
        precio: item.precio,
        tipo: item.tipo,
        especialidad_id: item.especialidad_id || ''
      });
    } else {
      setCurrentItem(null);
      setFormData({
        nombre: '',
        precio: '',
        tipo: 'Procedimiento',
        especialidad_id: ''
      });
    }
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.precio) {
      setError('Nombre y precio son obligatorios');
      return;
    }

    try {
      const url = currentItem ? `/api/tarifario/${currentItem.id}` : '/api/tarifario';
      const method = currentItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchItems();
        handleClose();
      } else {
        setError('Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await fetch(`/api/tarifario/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Gestión de Tarifario</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Nuevo Servicio
        </Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Especialidad</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const spec = specialties.find(s => s.id === item.especialidad_id);
                return (
                  <TableRow key={item.id} sx={{ opacity: item.activo ? 1 : 0.6 }}>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell>{spec ? spec.nombre : '-'}</TableCell>
                    <TableCell>${item.precio}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.activo ? 'Activo' : 'Inactivo'} 
                        color={item.activo ? 'success' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpen(item)} color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleToggleActive(item.id)} color={item.activo ? 'warning' : 'success'}>
                        {item.activo ? <ToggleOffIcon /> : <ToggleOnIcon />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleClose}>
        <DialogTitle>{currentItem ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nombre del Servicio"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            fullWidth
            autoFocus
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
                label="Precio ($)"
                name="precio"
                type="number"
                value={formData.precio}
                onChange={handleChange}
                fullWidth
            />
            <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select name="tipo" value={formData.tipo} onChange={handleChange} label="Tipo">
                <MenuItem value="Consulta">Consulta</MenuItem>
                <MenuItem value="Procedimiento">Procedimiento</MenuItem>
                <MenuItem value="Insumo">Insumo</MenuItem>
                </Select>
            </FormControl>
          </Box>
          <FormControl fullWidth>
            <InputLabel>Especialidad (Opcional)</InputLabel>
            <Select
              name="especialidad_id"
              value={formData.especialidad_id}
              onChange={handleChange}
              label="Especialidad (Opcional)"
            >
              <MenuItem value=""><em>Ninguna</em></MenuItem>
              {specialties.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TarifarioManagement;