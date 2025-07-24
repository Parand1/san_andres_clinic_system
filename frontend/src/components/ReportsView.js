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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid
} from '@mui/material';
import { useAuth } from '../AuthContext';

function ReportsView() {
  const { token } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('Por favor, seleccione un rango de fechas.');
      return;
    }
    setLoading(true);
    setError('');
    setReportData(null);
    try {
      const response = await fetch(`/api/contabilidad/reportes?fecha_inicio=${startDate}&fecha_fin=${endDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Error al generar el reporte.');
      }
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reportes Financieros
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">Seleccionar Rango de Fechas</Typography>
        <Grid container spacing={2} alignItems="center" sx={{mt: 1}}>
            <Grid item xs={12} sm={5}>
                <TextField
                    label="Fecha de Inicio"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                />
            </Grid>
            <Grid item xs={12} sm={5}>
                <TextField
                    label="Fecha de Fin"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                />
            </Grid>
            <Grid item xs={12} sm={2}>
                <Button variant="contained" onClick={handleGenerateReport} disabled={loading} fullWidth>
                    Generar
                </Button>
            </Grid>
        </Grid>
      </Paper>

      {loading && <CircularProgress sx={{ display: 'block', margin: 'auto' }} />}
      {error && <Alert severity="error">{error}</Alert>}

      {reportData && (
        <Box>
          {/* Resumen del Reporte */}
          <Typography variant="h5" gutterBottom sx={{mt: 4}}>Resumen de Transacciones</Typography>
          <TableContainer component={Paper} sx={{mb: 4}}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tipo de Transacción</TableCell>
                  <TableCell>Método de Pago</TableCell>
                  <TableCell align="right">Número de Transacciones</TableCell>
                  <TableCell align="right">Monto Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.resumen.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.tipo_transaccion}</TableCell>
                    <TableCell>{row.metodo_pago}</TableCell>
                    <TableCell align="right">{row.numero_transacciones}</TableCell>
                    <TableCell align="right">${parseFloat(row.total_monto).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Detalle del Reporte */}
          <Typography variant="h5" gutterBottom>Detalle de Transacciones</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.detalle.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.fecha).toLocaleString()}</TableCell>
                    <TableCell>{row.tipo_transaccion}</TableCell>
                    <TableCell>{row.descripcion}</TableCell>
                    <TableCell>{`${row.nombre} ${row.apellido}`}</TableCell>
                    <TableCell align="right">${parseFloat(row.monto).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Container>
  );
}

export default ReportsView;
