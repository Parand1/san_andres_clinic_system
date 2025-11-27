import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Button, Grid, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Card, CardContent, Chip, CircularProgress, TextField, Alert, IconButton
} from '@mui/material';
import { useAuth } from '../AuthContext';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddTransactionDialog from './AddTransactionDialog';

function CashBoxView() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cajaState, setCajaState] = useState(null); // Datos de la caja
  const [isBoxOpen, setIsBoxOpen] = useState(false);
  
  // Formularios
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null); // Para edición
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCajaState();
  }, []);

  const fetchCajaState = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contabilidad/caja/estado', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      setIsBoxOpen(data.cajaAbierta);
      setCajaState(data);
      
      // Si está cerrada y hay un cierre previo, sugerir monto
      if (!data.cajaAbierta && data.ultimo_cierre) {
          setOpeningAmount(data.ultimo_cierre);
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar estado de caja.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBox = async () => {
    try {
        const response = await fetch('/api/contabilidad/caja/apertura', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ monto_inicial: parseFloat(openingAmount) })
        });
        if (response.ok) fetchCajaState();
    } catch (err) { setError('Error al abrir caja'); }
  };

  const handleCloseBox = async () => {
    try {
        const response = await fetch('/api/contabilidad/caja/cierre', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ monto_final_efectivo: parseFloat(closingAmount), notas: closingNotes })
        });
        if (response.ok) fetchCajaState();
    } catch (err) { setError('Error al cerrar caja'); }
  };

  const handleEditTransaction = (transaction) => {
      setSelectedTransaction(transaction);
      setTransactionDialogOpen(true);
  };

  const handleDeleteTransaction = async (id) => {
      if (!window.confirm('¿Estás seguro de eliminar este movimiento?')) return;
      try {
          const response = await fetch(`/api/contabilidad/movimiento/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
              fetchCajaState();
          } else {
              const data = await response.json();
              alert(data.msg || 'Error al eliminar');
          }
      } catch (err) { alert('Error de conexión'); }
  };

  const handleDialogClose = () => {
      setTransactionDialogOpen(false);
      setSelectedTransaction(null);
  };

  // Determina si una transacción es editable por el usuario actual
  const isEditable = (mov) => {
      // Admin puede todo
      if (user.rol === 'admin') return true;
      
      // Secretaria solo sus movimientos manuales (pago_id null)
      // Excluir Aperturas y Cierres para seguridad (aunque backend lo valida también)
      if (mov.usuario_id === user.id && mov.pago_id === null) {
          if (mov.tipo_transaccion === 'Apertura de Caja' || mov.tipo_transaccion === 'Cierre de Caja') return false;
          return true;
      }
      return false;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;

  // VISTA: CAJA CERRADA (APERTURA)
  if (!isBoxOpen) {
      return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <PointOfSaleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom>Apertura de Caja</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Inicia las operaciones del día.
                </Typography>
                
                <TextField
                    label="Monto Inicial ($)"
                    type="number"
                    fullWidth
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    sx={{ mb: 3 }}
                    autoFocus
                />
                
                <Button variant="contained" size="large" fullWidth onClick={handleOpenBox} disabled={!openingAmount}>
                    Abrir Caja
                </Button>
            </Paper>
        </Container>
      );
  }

  // VISTA: CAJA ABIERTA (DASHBOARD)
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">Control de Caja</Typography>
            <Box>
                <Button 
                    variant="contained" 
                    color="success" 
                    startIcon={<AddIcon />} 
                    onClick={() => { setSelectedTransaction(null); setTransactionDialogOpen(true); }}
                    sx={{ mr: 2 }}
                >
                    Registrar Movimiento
                </Button>
            </Box>
        </Box>

        {/* TARJETAS DE RESUMEN */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>Saldo Inicial</Typography>
                        <Typography variant="h5">${cajaState.saldo_inicial.toFixed(2)}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>Ingresos</Typography>
                        <Typography variant="h5" color="success.main">+${cajaState.total_ingresos.toFixed(2)}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: '#ffebee' }}>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>Egresos</Typography>
                        <Typography variant="h5" color="error.main">-${cajaState.total_egresos.toFixed(2)}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card elevation={3} sx={{ borderLeft: '6px solid #2196f3' }}>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom fontWeight="bold">Saldo Actual</Typography>
                        <Typography variant="h4" color="primary.main" fontWeight="bold">${cajaState.saldo_actual.toFixed(2)}</Typography>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>

        {/* TABLA DE MOVIMIENTOS */}
        <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ px: 2, pt: 1 }}>Movimientos del Día</Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Hora</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell>Método</TableCell>
                            <TableCell>Usuario</TableCell>
                            <TableCell align="right">Monto</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {cajaState.movimientos.map((mov) => (
                            <TableRow key={mov.id}>
                                <TableCell>{new Date(mov.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={mov.tipo_transaccion} 
                                        size="small" 
                                        color={
                                            mov.tipo_transaccion.includes('Ingreso') ? 'success' : 
                                            mov.tipo_transaccion === 'Apertura de Caja' ? 'info' : 'error'
                                        } 
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>{mov.descripcion}</TableCell>
                                <TableCell>{mov.metodo_pago}</TableCell>
                                <TableCell>{mov.usuario_nombre}</TableCell>
                                <TableCell align="right" sx={{ 
                                    fontWeight: 'bold',
                                    color: mov.tipo_transaccion.includes('Ingreso') || mov.tipo_transaccion === 'Apertura de Caja' ? 'success.main' : 'error.main'
                                }}>
                                    {mov.tipo_transaccion.includes('Ingreso') || mov.tipo_transaccion === 'Apertura de Caja' ? '+' : '-'}
                                    ${parseFloat(mov.monto).toFixed(2)}
                                </TableCell>
                                <TableCell align="center">
                                    {isEditable(mov) && (
                                        <>
                                            <IconButton size="small" onClick={() => handleEditTransaction(mov)} color="primary">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteTransaction(mov.id)} color="error">
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>

        {/* SECCIÓN DE CIERRE */}
        <Paper sx={{ p: 3, bgcolor: '#fff3e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LockIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Cierre de Caja</Typography>
            </Box>
            <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={4}>
                    <TextField 
                        label="Efectivo Contado ($)" 
                        type="number" 
                        fullWidth 
                        value={closingAmount}
                        onChange={(e) => setClosingAmount(e.target.value)}
                        helperText={`Saldo esperado: $${cajaState.saldo_actual.toFixed(2)}`}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        label="Notas de Cierre" 
                        fullWidth 
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button 
                        variant="contained" 
                        color="warning" 
                        fullWidth 
                        onClick={handleCloseBox}
                        disabled={!closingAmount}
                    >
                        Cerrar Día
                    </Button>
                </Grid>
            </Grid>
        </Paper>

        <AddTransactionDialog 
            open={transactionDialogOpen} 
            onClose={handleDialogClose}
            onSaveSuccess={fetchCajaState}
            initialData={selectedTransaction}
        />
    </Container>
  );
}

export default CashBoxView;