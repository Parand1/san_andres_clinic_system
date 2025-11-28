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
  CircularProgress,
  Stack,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import AddIcon from '@mui/icons-material/Add';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalOfferIcon fontSize="large" color="primary" /> Tarifario de Servicios
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
                Gestión de precios, consultas y procedimientos
            </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ borderRadius: 2, px: 3, py: 1, boxShadow: '0 4px 12px rgba(0, 167, 157, 0.3)' }}
        >
          Nuevo Servicio
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: '#f9fafb' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>SERVICIO</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>TIPO</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>ESPECIALIDAD</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: '#666' }}>PRECIO UNIT.</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#666' }}>ESTADO</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#666' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const spec = specialties.find(s => s.id === item.especialidad_id);
              return (
                <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, opacity: item.activo ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                  <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                          {item.nombre}
                      </Typography>
                  </TableCell>
                  <TableCell>
                      <Chip 
                        label={item.tipo} 
                        size="small" 
                        variant="outlined"
                        color={item.tipo === 'Consulta' ? 'primary' : 'default'}
                      />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                      {spec ? spec.nombre : 'General'}
                  </TableCell>
                  <TableCell align="right">
                      <Typography fontWeight="bold" color="success.main">
                        ${parseFloat(item.precio).toFixed(2)}
                      </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={item.activo ? 'Activo' : 'Inactivo'} 
                      color={item.activo ? 'success' : 'default'} 
                      size="small" 
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                        <IconButton onClick={() => handleOpen(item)} color="primary">
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={item.activo ? "Desactivar" : "Activar"}>
                        <IconButton onClick={() => handleToggleActive(item.id)} color={item.activo ? 'warning' : 'success'}>
                            {item.activo ? <ToggleOffIcon /> : <ToggleOnIcon />}
                        </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
            {currentItem ? 'Editar Servicio' : 'Nuevo Servicio'}
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
                label="Nombre del Servicio"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                autoFocus
            />
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Precio ($)"
                    name="precio"
                    type="number"
                    value={formData.precio}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                />
                <FormControl fullWidth variant="outlined">
                    <InputLabel>Tipo</InputLabel>
                    <Select name="tipo" value={formData.tipo} onChange={handleChange} label="Tipo">
                        <MenuItem value="Consulta">Consulta</MenuItem>
                        <MenuItem value="Procedimiento">Procedimiento</MenuItem>
                        <MenuItem value="Insumo">Insumo</MenuItem>
                    </Select>
                </FormControl>
            </Stack>
            <FormControl fullWidth variant="outlined">
                <InputLabel>Especialidad (Opcional)</InputLabel>
                <Select
                name="especialidad_id"
                value={formData.especialidad_id}
                onChange={handleChange}
                label="Especialidad (Opcional)"
                >
                <MenuItem value=""><em>Ninguna (General)</em></MenuItem>
                {specialties.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                ))}
                </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #eee', bgcolor: '#fafafa' }}>
          <Button onClick={handleClose} variant="outlined" color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TarifarioManagement;