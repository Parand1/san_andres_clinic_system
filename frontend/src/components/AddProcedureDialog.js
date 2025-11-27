import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../AuthContext';

function AddProcedureDialog({ open, onClose, appointment, onSaveSuccess }) {
  const { token } = useAuth();
  const [tarifario, setTarifario] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [itemsToAdd, setItemsToAdd] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchTarifario();
      setItemsToAdd([]);
      setError('');
    }
  }, [open]);

  const fetchTarifario = async () => {
    try {
      const response = await fetch('/api/tarifario', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTarifario(data);
      }
    } catch (err) {
      console.error('Error al cargar tarifario:', err);
    }
  };

  const handleAddItem = () => {
    if (!selectedItem) return;
    
    const newItem = {
      ...selectedItem,
      cantidad: parseInt(quantity),
      total: selectedItem.precio * parseInt(quantity)
    };

    setItemsToAdd([...itemsToAdd, newItem]);
    setSelectedItem(null);
    setQuantity(1);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...itemsToAdd];
    newItems.splice(index, 1);
    setItemsToAdd(newItems);
  };

  const handleSave = async () => {
    if (itemsToAdd.length === 0) return;

    setLoading(true);
    setError('');

    const payload = {
      cita_id: appointment.id,
      paciente_id: appointment.paciente_id,
      items: itemsToAdd.map(item => ({
        descripcion: item.nombre,
        precio_unitario: item.precio,
        cantidad: item.cantidad
      })),
      notas: 'Procedimiento registrado por profesional en consulta'
    };

    try {
      const response = await fetch('/api/pagos/adicional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        onSaveSuccess();
        onClose();
      } else {
        setError(data.msg || 'Error al registrar procedimientos.');
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const totalEstimado = itemsToAdd.reduce((sum, item) => sum + parseFloat(item.total), 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Registrar Procedimiento Adicional</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2, mt: 1 }}>
          <Autocomplete
            options={tarifario}
            getOptionLabel={(option) => `${option.nombre} - $${option.precio}`}
            value={selectedItem}
            onChange={(event, newValue) => setSelectedItem(newValue)}
            renderInput={(params) => <TextField {...params} label="Buscar Procedimiento" variant="outlined" />}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            label="Cant."
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            sx={{ width: 80 }}
            InputProps={{ inputProps: { min: 1 } }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddItem}
            disabled={!selectedItem}
            sx={{ height: 56 }}
          >
            <AddIcon />
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Procedimiento</TableCell>
              <TableCell align="right">Cant.</TableCell>
              <TableCell align="right">Precio U.</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itemsToAdd.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.nombre}</TableCell>
                <TableCell align="right">{item.cantidad}</TableCell>
                <TableCell align="right">${item.precio}</TableCell>
                <TableCell align="right">${item.total.toFixed(2)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleRemoveItem(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {itemsToAdd.length > 0 && (
              <TableRow>
                <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Total a Cobrar:</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>${totalEstimado.toFixed(2)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={loading || itemsToAdd.length === 0}
        >
          {loading ? 'Guardando...' : 'Confirmar Procedimientos'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddProcedureDialog;