import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Paper,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DiagnosisManagement from './DiagnosisManagement';
import MedicalHistoryDetailsForm from './MedicalHistoryDetailsForm';
import AntecedentsForm from './AntecedentsForm';
import OdontogramForm from './OdontogramForm';
import PsychologyEvaluationForm from './PsychologyEvaluationForm';
import { useAuth } from '../AuthContext';

function NewAttentionForm({ patient, attention: existingAttention, onSaveSuccess, onCancel }) { // Añadimos existingAttention
  const { token, user } = useAuth();
  const [attentionFormState, setAttentionFormState] = useState({
    motivo_consulta: '',
    notas_generales: '',
  });
  const [medicalHistoryDetails, setMedicalHistoryDetails] = useState({});
  const [antecedents, setAntecedents] = useState({});
  const [odontogram, setOdontogram] = useState({});
  const [psychologyEvaluation, setPsychologyEvaluation] = useState({});
  const [diagnoses, setDiagnoses] = useState([]); // Estado para diagnósticos locales

  // Referencias para llamar a los métodos de guardado de los hijos
  const antecedentsFormRef = useRef();
  const medicalHistoryDetailsFormRef = useRef();
  const odontogramFormRef = useRef();
  const psychologyEvaluationFormRef = useRef();
  const diagnosisManagementRef = useRef();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentAttentionId, setCurrentAttentionId] = useState(existingAttention?.id || null); // Usar ID existente o null
  const [isSaving, setIsSaving] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(false); // Nuevo estado para carga inicial

  // Cargar datos existentes si estamos en modo edición
  useEffect(() => {
    const loadExistingData = async () => {
      if (existingAttention) {
        setLoadingInitialData(true);
        setAttentionFormState({
          motivo_consulta: existingAttention.motivo_consulta || '',
          notas_generales: existingAttention.notas_generales || '',
        });
        setCurrentAttentionId(existingAttention.id);
        setLoadingInitialData(false);
      }
    };
    loadExistingData();
  }, [existingAttention]);

  const handleAttentionFormChange = (e) => {
    setAttentionFormState({ ...attentionFormState, [e.target.name]: e.target.value });
  };

  const handleMedicalHistoryDetailsChange = (data) => {
    setMedicalHistoryDetails(data);
  };

  const handleAntecedentsChange = (data) => {
    setAntecedents(data);
  };

  const handleOdontogramChange = (data) => {
    setOdontogram(data);
  };

  const handlePsychologyEvaluationChange = (data) => {
    setPsychologyEvaluation(data);
  };

  const handleDiagnosesChange = (data) => { // Nuevo handler para diagnósticos locales
    setDiagnoses(data);
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    if (!patient || !patient.id) {
      setError('No hay un paciente seleccionado para registrar la atención.');
      setIsSaving(false);
      return;
    }

    try {
      let attentionIdToUse = currentAttentionId;

      // 1. Guardar/Actualizar la Atención Principal
      const attentionPayload = {
        motivo_consulta: attentionFormState.motivo_consulta,
        notas_generales: attentionFormState.notas_generales,
      };

      if (!attentionIdToUse) {
        attentionPayload.paciente_id = patient.id;
      }

      const attentionResponse = await fetch(
        attentionIdToUse
          ? `/api/attentions/${attentionIdToUse}`
          : '/api/attentions',
        {
          method: attentionIdToUse ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(attentionPayload),
        }
      );

      const attentionData = await attentionResponse.json();
      if (!attentionResponse.ok) {
        throw new Error(attentionData.msg || 'Error al guardar la atención principal.');
      }
      
      if (!attentionIdToUse) {
        attentionIdToUse = attentionData.attention.id;
        setCurrentAttentionId(attentionIdToUse);
      }

      // 2. Guardar todos los sub-formularios en paralelo
      const savePromises = [];

      if (antecedentsFormRef.current) {
        savePromises.push(antecedentsFormRef.current.save(patient.id));
      }
      if (medicalHistoryDetailsFormRef.current) {
        savePromises.push(medicalHistoryDetailsFormRef.current.save(attentionIdToUse));
      }
      if (user.especialidades?.includes('Odontologia') && odontogramFormRef.current) {
        savePromises.push(odontogramFormRef.current.save(attentionIdToUse));
      }
      if (user.especialidades?.includes('Psicologia') && psychologyEvaluationFormRef.current) {
        savePromises.push(psychologyEvaluationFormRef.current.save(attentionIdToUse));
      }
      if (diagnosisManagementRef.current) {
        savePromises.push(diagnosisManagementRef.current.save(attentionIdToUse));
      }

      const results = await Promise.allSettled(savePromises);
      
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason.message)
        .join('; ');

      if (errors) {
        throw new Error(`Ocurrieron errores al guardar: ${errors}`);
      }

      setSuccess('Historia clínica completa guardada exitosamente.');

      setTimeout(() => {
        onSaveSuccess();
      }, 1500);

    } catch (err) {
      console.error('Error en handleSaveAll:', err);
      setError(err.message || 'No se pudo conectar con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingInitialData || !patient) { // Añadimos !patient
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando datos...</Typography> // Mensaje genérico
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {existingAttention ? 'Editar Atención' : 'Registrar Nueva Atención'} para {patient.nombre} {patient.apellido}
        </Typography>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <form onSubmit={handleSaveAll}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="primary">Información General de la Atención</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  margin="dense"
                  name="motivo_consulta"
                  label="Motivo de Consulta"
                  type="text"
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  value={attentionFormState.motivo_consulta}
                  onChange={handleAttentionFormChange}
                  required
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="dense"
                  name="notas_generales"
                  label="Notas Generales"
                  type="text"
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  value={attentionFormState.notas_generales}
                  onChange={handleAttentionFormChange}
                  sx={{ mb: 2 }}
                />
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mt: 2 }} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="primary">Antecedentes Médicos</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <AntecedentsForm
                  ref={antecedentsFormRef}
                  patientId={patient.id}
                  onDataChange={handleAntecedentsChange}
                />
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mt: 2 }} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="primary">Detalles de Historia Clínica</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <MedicalHistoryDetailsForm
                  ref={medicalHistoryDetailsFormRef}
                  attentionId={currentAttentionId}
                  onDataChange={handleMedicalHistoryDetailsChange}
                />
              </AccordionDetails>
            </Accordion>

            {user && user.especialidades && user.especialidades.includes('Odontologia') && (
              <Accordion sx={{ mt: 2 }} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" color="primary">Odontograma</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <OdontogramForm
                    attentionId={currentAttentionId}
                    onDataChange={handleOdontogramChange}
                  />
                </AccordionDetails>
              </Accordion>
            )}

            {user && user.especialidades && user.especialidades.includes('Psicologia') && (
              <Accordion sx={{ mt: 2 }} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" color="primary">Evaluación de Psicología</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <PsychologyEvaluationForm
                    attentionId={currentAttentionId}
                    onDataChange={handlePsychologyEvaluationChange}
                  />
                </AccordionDetails>
              </Accordion>
            )}

            <Accordion sx={{ mt: 2 }} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="primary">Diagnósticos</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <DiagnosisManagement
                  ref={diagnosisManagementRef}
                  attentionId={currentAttentionId}
                  onDiagnosesChange={handleDiagnosesChange}
                />
              </AccordionDetails>
            </Accordion>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={onCancel} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
                {isSaving ? <CircularProgress size={24} /> : 'Guardar Historia Clínica'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

export default NewAttentionForm;