import React, { useState } from 'react';
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
  Typography
} from '@mui/material';

function PaymentDialog({ open, onClose, onSave, appointment }) {
  const [formState, setFormState] = useState({ metodo_pago: 'Efectivo', notas: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!formState.metodo_pago) {
      setError('Debe seleccionar un método de pago.');
      return;
    }
    // El ID del pago se manejará en el componente padre
    onSave(formState);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Registrar Pago de Consulta</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="h6">{appointment?.title}</Typography>
        <Typography>Monto: $40.00 (Valor Fijo por ahora)</Typography>
        
        <FormControl fullWidth margin="dense" required sx={{ mt: 2 }}>
          <InputLabel>Método de Pago</InputLabel>
          <Select name="metodo_pago" value={formState.metodo_pago} onChange={handleChange}>
            <MenuItem value="Efectivo">Efectivo</MenuItem>
            <MenuItem value="Tarjeta">Tarjeta</MenuItem>
            <MenuItem value="Transferencia">Transferencia</MenuItem>
            <MenuItem value="Seguro">Seguro</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Notas sobre el pago"
          name="notas"
          value={formState.notas}
          onChange={handleChange}
          fullWidth
          multiline
          rows={2}
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Confirmar Pago</Button>
      </DialogActions>
    </Dialog>
  );
}

export default PaymentDialog;
