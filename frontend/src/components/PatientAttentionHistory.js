import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress, // Nuevo
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../AuthContext';
import DiagnosisManagement from './DiagnosisManagement';
import MedicalHistoryDetailsForm from './MedicalHistoryDetailsForm';
import AntecedentsForm from './AntecedentsForm';
import OdontogramForm from './OdontogramForm';
import PsychologyEvaluationForm from './PsychologyEvaluationForm';

function PatientAttentionHistory({ patientId, onBack, patient }) {
  const { token, user } = useAuth();
  const [attentions, setAttentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedAttention, setSelectedAttention] = useState(null);
  const [selectedAttentionDetails, setSelectedAttentionDetails] = useState(null); // Para cargar detalles completos
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchAttentions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/attentions?paciente_id=${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setAttentions(data);
      } else {
        setError(data.msg || 'Error al cargar historial de atenciones.');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor para cargar historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && patientId) {
      fetchAttentions();
    }
  }, [token, patientId]);

  const handleOpenDetailDialog = async (attention) => {
    setSelectedAttention(attention);
    setLoadingDetails(true);
    setError('');
    try {
      // Cargar detalles completos de la atención
      const [detailsRes, antecedentsRes, odontogramRes, psychologyRes] = await Promise.all([
        fetch(`http://localhost:5000/api/medical-history/${attention.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:5000/api/antecedents/${attention.paciente_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:5000/api/odontogram/${attention.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:5000/api/psychology/${attention.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const detailsData = detailsRes.ok ? await detailsRes.json() : {};
      const antecedentsData = antecedentsRes.ok ? await antecedentsRes.json() : {};
      const odontogramData = odontogramRes.ok ? await odontogramRes.json() : {};
      const psychologyData = psychologyRes.ok ? await psychologyRes.json() : {};

      setSelectedAttentionDetails({
        ...attention,
        medicalHistoryDetails: detailsData,
        antecedents: antecedentsData,
        odontogram: odontogramData,
        psychologyEvaluation: psychologyData,
      });

    } catch (err) {
      console.error('Error al cargar detalles de la atención:', err);
      setError('Error al cargar detalles completos de la atención.');
    } finally {
      setLoadingDetails(false);
      setOpenDetailDialog(true);
    }
  };

  const handleCloseDetailDialog = () => {
    setOpenDetailDialog(false);
    setSelectedAttention(null);
    setSelectedAttentionDetails(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Cargando historial de atenciones...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ my: 4 }}>
        <Button variant="outlined" onClick={onBack} sx={{ mb: 2 }}>
          Volver a Detalles del Paciente
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Historial de Atenciones para {patient?.nombre} {patient?.apellido}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="attentions history table">
            <TableHead>
              <TableRow>
                <TableCell>ID Atención</TableCell>
                <TableCell>Profesional</TableCell>
                <TableCell>Fecha Atención</TableCell>
                <TableCell>Motivo Consulta</TableCell>
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
              {attentions.map((attention) => (
                <TableRow
                  key={attention.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {attention.id}
                  </TableCell>
                  <TableCell>{attention.profesional_nombre} {attention.profesional_apellido}</TableCell>
                  <TableCell>{new Date(attention.fecha_atencion).toLocaleDateString()} {new Date(attention.fecha_atencion).toLocaleTimeString()}</TableCell>
                  <TableCell>{attention.motivo_consulta}</TableCell>
                  {user && user.rol === 'admin' && (
                    <>
                      <TableCell>
                        {attention.created_by_nombre && attention.created_by_apellido
                          ? `${attention.created_by_nombre} ${attention.created_by_apellido}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {attention.updated_at
                          ? `${new Date(attention.updated_at).toLocaleDateString()} ${new Date(attention.updated_at).toLocaleTimeString()}`
                          : 'N/A'}
                        {attention.updated_by_nombre && attention.updated_by_apellido
                          ? ` por ${attention.updated_by_nombre} ${attention.updated_by_apellido}`
                          : ''}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenDetailDialog(attention)}
                    >
                      Ver Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Diálogo para Ver Detalles de Atención */}
        <Dialog open={openDetailDialog} onClose={handleCloseDetailDialog} fullWidth maxWidth="md">
          <DialogTitle>Detalles de Atención ID: {selectedAttention?.id}</DialogTitle>
          <DialogContent dividers>
            {loadingDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Cargando detalles...</Typography>
              </Box>
            ) : selectedAttentionDetails && (
              <Box>
                <Typography variant="h6" gutterBottom>Información General</Typography>
                <Typography><strong>Paciente:</strong> {selectedAttentionDetails.paciente_nombre} {selectedAttentionDetails.paciente_apellido}</Typography>
                <Typography><strong>Profesional:</strong> {selectedAttentionDetails.profesional_nombre} {selectedAttentionDetails.profesional_apellido}</Typography>
                <Typography><strong>Fecha Atención:</strong> {new Date(selectedAttentionDetails.fecha_atencion).toLocaleDateString()} {new Date(selectedAttentionDetails.fecha_atencion).toLocaleTimeString()}</Typography>
                <Typography><strong>Motivo de Consulta:</strong> {selectedAttentionDetails.motivo_consulta}</Typography>
                <Typography><strong>Notas Generales:</strong> {selectedAttentionDetails.notas_generales || 'N/A'}</Typography>

                {user && user.rol === 'admin' && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>Auditoría</Typography>
                    <Typography><strong>Creado por:</strong> {selectedAttentionDetails.created_by_nombre} {selectedAttentionDetails.created_by_apellido}</Typography>
                    <Typography><strong>Última Modificación:</strong> {selectedAttentionDetails.updated_at ? `${new Date(selectedAttentionDetails.updated_at).toLocaleDateString()} ${new Date(selectedAttentionDetails.updated_at).toLocaleTimeString()}` : 'N/A'}</Typography>
                    {selectedAttentionDetails.updated_by_nombre && selectedAttentionDetails.updated_by_apellido && (
                      <Typography><strong>Modificado por:</strong> {selectedAttentionDetails.updated_by_nombre} {selectedAttentionDetails.updated_by_apellido}</Typography>
                    )}
                  </Box>
                )}

                <Accordion sx={{ mt: 2 }} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" color="primary">Antecedentes Médicos</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <AntecedentsForm
                      patientId={selectedAttentionDetails.paciente_id}
                      readOnly={true} // Modo solo lectura
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mt: 2 }} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" color="primary">Detalles de Historia Clínica</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <MedicalHistoryDetailsForm
                      attentionId={selectedAttentionDetails.id}
                      readOnly={true} // Modo solo lectura
                    />
                  </AccordionDetails>
                </Accordion>

                {selectedAttentionDetails.profesional_especialidades && selectedAttentionDetails.profesional_especialidades.includes('Odontologia') && (
                  <Accordion sx={{ mt: 2 }} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6" color="primary">Odontograma</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <OdontogramForm
                        attentionId={selectedAttentionDetails.id}
                        readOnly={true} // Modo solo lectura
                      />
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedAttentionDetails.profesional_especialidades && selectedAttentionDetails.profesional_especialidades.includes('Psicologia') && (
                  <Accordion sx={{ mt: 2 }} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6" color="primary">Evaluación de Psicología</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <PsychologyEvaluationForm
                        attentionId={selectedAttentionDetails.id}
                        readOnly={true} // Modo solo lectura
                      />
                    </AccordionDetails>
                  </Accordion>
                )}

                <Accordion sx={{ mt: 2 }} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" color="primary">Diagnósticos</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <DiagnosisManagement attentionId={selectedAttentionDetails.id} readOnly={true} />
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetailDialog} variant="contained">
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

export default PatientAttentionHistory;