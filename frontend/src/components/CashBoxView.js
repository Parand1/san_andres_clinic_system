import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Grid
} from '@mui/material';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom'; // Importar Link

function CashBoxView() {
  const { token } = useAuth();
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApiCall = async (url, body, successMessage) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Ocurrió un error.');
      }
      setSuccess(data.msg || successMessage);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBox = async () => {
    if (await handleApiCall('/api/contabilidad/caja/apertura', { monto_inicial: parseFloat(openingAmount) }, 'Caja abierta exitosamente.')) {
        setOpeningAmount('');
    }
  };

  const handleCloseBox = async () => {
    if (await handleApiCall('/api/contabilidad/caja/cierre', { monto_final_efectivo: parseFloat(closingAmount), notas: notes }, 'Caja cerrada exitosamente.')) {
        setClosingAmount('');
        setNotes('');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestión de Caja Diaria
        </Typography>
        <Button variant="contained" color="info" component={Link} to="/reports">
          Ver Reportes
        </Button>
      </Box>
      
      {loading && <CircularProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={4}>
        {/* Apertura de Caja */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Apertura de Caja
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{mb: 2}} >
              Registra el monto inicial para empezar las operaciones del día.
            </Typography>
            <TextField
              label="Monto Inicial"
              type="number"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{mr: 1}}>$</Typography>,
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" onClick={handleOpenBox} disabled={loading || !openingAmount}>
              Abrir Caja
            </Button>
          </Paper>
        </Grid>

        {/* Cierre de Caja */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Cierre de Caja
            </Typography>
             <Typography variant="body2" color="text.secondary" sx={{mb: 2}} >
              Registra el monto final contado en efectivo y añade notas relevantes.
            </Typography>
            <TextField
              label="Monto Final en Efectivo"
              type="number"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
               InputProps={{
                startAdornment: <Typography sx={{mr: 1}}>$</Typography>,
              }}
            />
            <TextField
              label="Notas de Cierre"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
             <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" color="secondary" onClick={handleCloseBox} disabled={loading || !closingAmount}>
              Cerrar Caja
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default CashBoxView;
