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
  Typography,
  CircularProgress,
  Box,
  Paper,
  Autocomplete,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../AuthContext';

function PaymentDialog({ open, onClose, onSave, appointment }) {
  const { token } = useAuth();
  const [formState, setFormState] = useState({ metodo_pago: 'Efectivo', notas: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingPayment, setPendingPayment] = useState(null);
  
  // Estados para nuevo pago (Inicial)
  const [tarifario, setTarifario] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [itemsToAdd, setItemsToAdd] = useState([]);

  useEffect(() => {
    if (open && appointment) {
      fetchPendingPayment();
      fetchTarifario();
      setItemsToAdd([]); // Reiniciar items al abrir
      setError('');
    }
  }, [open, appointment]);

  const fetchPendingPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pagos?cita_id=${appointment.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        const pendiente = data.find(p => p.estado_pago === 'Pendiente');
        setPendingPayment(pendiente || null);
      }
    } catch (err) {
      console.error('Error connection', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTarifario = async () => {
    try {
      const response = await fetch('/api/tarifario', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setTarifario(await response.json());
      }
    } catch (err) {
        console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
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

  const handleSave = () => {
    if (!formState.metodo_pago) {
      setError('Debe seleccionar un método de pago.');
      return;
    }

    if (pendingPayment) {
        // Cobro de deuda existente
        onSave({
            ...formState,
            pagoId: pendingPayment.id
        });
    } else {
        // Cobro inicial (Nuevo)
        if (itemsToAdd.length === 0) {
            setError('Debe agregar al menos un servicio o item para cobrar.');
            return;
        }
        onSave({
            ...formState,
            items: itemsToAdd, // Enviamos la lista de items
            isInitial: true // Flag para saber que es pago inicial
        });
    }
  };

  const totalToPay = pendingPayment 
    ? parseFloat(pendingPayment.monto_total)
    : itemsToAdd.reduce((sum, item) => sum + item.total, 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {pendingPayment ? 'Cobrar Saldo Pendiente' : 'Registrar Pago Inicial'}
      </DialogTitle>
      <DialogContent>
        {loading && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
            <strong>Paciente:</strong> {appointment?.title}
        </Typography>

        {/* SECCIÓN DE SELECCIÓN DE SERVICIOS (Solo si no hay pendiente) */}
        {!pendingPayment && !loading && (
            <Box sx={{ mb: 3, border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Detalle de Servicios</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
                    <Autocomplete
                        options={tarifario}
                        getOptionLabel={(option) => `${option.nombre} - $${option.precio}`}
                        value={selectedItem}
                        onChange={(event, newValue) => setSelectedItem(newValue)}
                        renderInput={(params) => <TextField {...params} label="Buscar Servicio" size="small" />}
                        sx={{ flexGrow: 1 }}
                    />
                    <TextField
                        label="Cant."
                        type="number"
                        size="small"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        sx={{ width: 70 }}
                        InputProps={{ inputProps: { min: 1 } }}
                    />
                    <Button variant="contained" size="small" onClick={handleAddItem} disabled={!selectedItem}>
                        <AddIcon />
                    </Button>
                </Box>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Descripción</TableCell>
                            <TableCell align="right">Cant.</TableCell>
                            <TableCell align="right">Total</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {itemsToAdd.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.nombre}</TableCell>
                                <TableCell align="right">{item.cantidad}</TableCell>
                                <TableCell align="right">${item.total.toFixed(2)}</TableCell>
                                <TableCell padding="none">
                                    <IconButton size="small" onClick={() => handleRemoveItem(index)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {itemsToAdd.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>
                                    Ningún servicio agregado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Box>
        )}

        {/* RESUMEN DE PAGO */}
        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9', mb: 2 }}>
            <Typography variant="h4" color="primary" align="center" sx={{ fontWeight: 'bold' }}>
                ${totalToPay.toFixed(2)}
            </Typography>
            <Typography variant="caption" display="block" align="center" color="text.secondary">
                Total a Pagar
            </Typography>
            {pendingPayment && pendingPayment.notas && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Nota: {pendingPayment.notas}
                    </Typography>
            )}
        </Paper>

        <FormControl fullWidth margin="dense" required>
            <InputLabel>Método de Pago</InputLabel>
            <Select name="metodo_pago" value={formState.metodo_pago} onChange={handleChange}>
                <MenuItem value="Efectivo">Efectivo</MenuItem>
                <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                <MenuItem value="Transferencia">Transferencia</MenuItem>
                <MenuItem value="Seguro">Seguro</MenuItem>
            </Select>
        </FormControl>

        <TextField
            label="Notas de Caja"
            name="notas"
            value={formState.notas}
            onChange={handleChange}
            fullWidth
            multiline
            rows={2}
            margin="dense"
            placeholder="Ej: Nro de Voucher, Referencia..."
        />

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
            onClick={handleSave} 
            variant="contained" 
            color="success" 
            disabled={loading || (!pendingPayment && itemsToAdd.length === 0)}
        >
          {pendingPayment ? 'Cobrar Saldo' : 'Registrar y Pagar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PaymentDialog;
