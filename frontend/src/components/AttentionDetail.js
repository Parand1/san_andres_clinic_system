import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DiagnosisManagement from './DiagnosisManagement';
import MedicalHistoryDetailsForm from './MedicalHistoryDetailsForm';
import AntecedentsForm from './AntecedentsForm';
import OdontogramForm from './OdontogramForm';
import PsychologyEvaluationForm from './PsychologyEvaluationForm';

function AttentionDetail({ attention, onBack }) {
  if (!attention) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button variant="contained" onClick={onBack} sx={{ mb: 2 }}>
        Volver al Historial
      </Button>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Detalles de la Atención del {new Date(attention.fecha_atencion).toLocaleString()}
        </Typography>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Información General</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography><strong>Motivo:</strong> {attention.motivo_consulta}</Typography>
            <Typography><strong>Notas:</strong> {attention.notas_generales}</Typography>
            <Typography><strong>Profesional:</strong> {`${attention.profesional_nombre} ${attention.profesional_apellido}`}</Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Antecedentes Médicos</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <AntecedentsForm patientId={attention.paciente_id} readOnly={true} />
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Detalles de Historia Clínica</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <MedicalHistoryDetailsForm attentionId={attention.id} readOnly={true} />
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Odontograma</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <OdontogramForm attentionId={attention.id} readOnly={true} />
          </AccordionDetails>
        </Accordion>

        {attention.profesional_especialidades?.includes('Psicologia') && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Evaluación de Psicología</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <PsychologyEvaluationForm attentionId={attention.id} readOnly={true} />
            </AccordionDetails>
          </Accordion>
        )}

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Diagnósticos</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DiagnosisManagement attentionId={attention.id} readOnly={true} />
          </AccordionDetails>
        </Accordion>

      </Paper>
    </Container>
  );
}

export default AttentionDetail;
