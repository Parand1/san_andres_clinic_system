import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Autocomplete, Box, Typography, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { useAuth } from '../AuthContext';

function AddTransactionDialog({ open, onClose, onSaveSuccess, initialData }) {
  const { token } = useAuth();
  const [type, setType] = useState('Ingreso'); // 'Ingreso' | 'Egreso'
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  
  // Para ventas directas (Ingreso)
  const [tarifario, setTarifario] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (open) {
        if (initialData) {
            // Modo Edición
            // Mapear tipos de DB a tipos de UI
            const uiType = initialData.tipo_transaccion.includes('Ingreso') ? 'Ingreso' : 'Egreso';
            setType(uiType);
            setDescription(initialData.descripcion);
            setAmount(initialData.monto);
            setPaymentMethod(initialData.metodo_pago);
        } else {
            // Modo Creación
            resetForm();
        }
        
        // Cargar tarifario si es ingreso (o si vamos a editar un ingreso)
        if (!initialData || initialData.tipo_transaccion.includes('Ingreso')) {
             fetchTarifario();
        }
    }
  }, [open, initialData]);

  const fetchTarifario = async () => {
    try {
      const response = await fetch('/api/tarifario', { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setTarifario(await response.json());
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!amount || !description) return;

    const payload = {
        tipo: type,
        monto: parseFloat(amount),
        metodo_pago: paymentMethod,
        descripcion: description
    };

    try {
        let url = '/api/contabilidad/movimiento';
        let method = 'POST';

        if (initialData) {
            url = `/api/contabilidad/movimiento/${initialData.id}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            onSaveSuccess();
            onClose();
            resetForm();
        }
    } catch (err) {
        console.error(err);
    }
  };

  const resetForm = () => {
      setType('Ingreso');
      setDescription('');
      setAmount('');
      setSelectedItem(null);
      setPaymentMethod('Efectivo');
  };

  const handleItemSelect = (newValue) => {
      setSelectedItem(newValue);
      if (newValue) {
          setDescription(newValue.nombre);
          setAmount(newValue.precio);
      }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? 'Editar Movimiento' : 'Registrar Movimiento'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
                value={type}
                exclusive
                onChange={(e, newType) => { if(newType) setType(newType); }}
                color="primary"
            >
                <ToggleButton value="Ingreso" color="success">Ingreso / Venta</ToggleButton>
                <ToggleButton value="Egreso" color="error">Gasto / Salida</ToggleButton>
            </ToggleButtonGroup>
        </Box>

        {type === 'Ingreso' && (
            <Box sx={{ mb: 2 }}>
                <Autocomplete
                    options={tarifario}
                    getOptionLabel={(option) => `${option.nombre} - $${option.precio}`}
                    value={selectedItem}
                    onChange={(event, newValue) => handleItemSelect(newValue)}
                    renderInput={(params) => <TextField {...params} label="Buscar Servicio (Opcional)" />}
                />
            </Box>
        )}

        <TextField
            label="Descripción"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
                label="Monto ($)"
                type="number"
                fullWidth
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            <FormControl fullWidth>
                <InputLabel>Método</InputLabel>
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} label="Método">
                    <MenuItem value="Efectivo">Efectivo</MenuItem>
                    <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                    <MenuItem value="Transferencia">Transferencia</MenuItem>
                </Select>
            </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" color={type === 'Ingreso' ? 'success' : 'error'}>
            {initialData ? 'Guardar Cambios' : `Registrar ${type}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddTransactionDialog;