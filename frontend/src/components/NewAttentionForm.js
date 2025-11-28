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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Avatar,
  Grid,
  Stack // Asegurar importación de Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FactCheckIcon from '@mui/icons-material/FactCheck';

import DiagnosisManagement from './DiagnosisManagement';
import MedicalHistoryDetailsForm from './MedicalHistoryDetailsForm';
import AntecedentsForm from './AntecedentsForm';
import OdontogramForm from './OdontogramForm';
import PsychologyEvaluationForm from './PsychologyEvaluationForm';
import { useAuth } from '../AuthContext';

function NewAttentionForm({ patient, attention: existingAttention, onSaveSuccess, onSaveError, onCancel, citaId }) {
  const { token, user } = useAuth();
  const [attentionFormState, setAttentionFormState] = useState({
    motivo_consulta: '',
    notas_generales: '',
    procedimientos_adicionales_facturables: '',
  });
  const [medicalHistoryDetails, setMedicalHistoryDetails] = useState({});
  const [antecedents, setAntecedents] = useState({});
  const [odontogram, setOdontogram] = useState({});
  const [psychologyEvaluation, setPsychologyEvaluation] = useState({});
  const [diagnoses, setDiagnoses] = useState([]);

  const antecedentsFormRef = useRef();
  const medicalHistoryDetailsFormRef = useRef();
  const odontogramFormRef = useRef();
  const psychologyEvaluationFormRef = useRef();
  const diagnosisManagementRef = useRef();

  const [error, setError] = useState('');
  const [currentAttentionId, setCurrentAttentionId] = useState(existingAttention?.id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(false);

  useEffect(() => {
    const loadExistingData = async () => {
      if (existingAttention) {
        setLoadingInitialData(true);
        setAttentionFormState({
          motivo_consulta: existingAttention.motivo_consulta || '',
          notas_generales: existingAttention.notas_generales || '',
          procedimientos_adicionales_facturables: existingAttention.procedimientos_adicionales_facturables || '',
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

  const handleMedicalHistoryDetailsChange = (data) => setMedicalHistoryDetails(data);
  const handleAntecedentsChange = (data) => setAntecedents(data);
  const handleOdontogramChange = (data) => setOdontogram(data);
  const handlePsychologyEvaluationChange = (data) => setPsychologyEvaluation(data);
  const handleDiagnosesChange = (data) => setDiagnoses(data);

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    if (!patient || !patient.id) {
      setError('No hay un paciente seleccionado para registrar la atención.');
      setIsSaving(false);
      return;
    }

    try {
      let attentionIdToUse = currentAttentionId;

      const attentionPayload = {
        motivo_consulta: attentionFormState.motivo_consulta,
        notas_generales: attentionFormState.notas_generales,
        procedimientos_adicionales_facturables: attentionFormState.procedimientos_adicionales_facturables,
      };

      if (!attentionIdToUse) {
        attentionPayload.paciente_id = patient.id;
      }

      const attentionResponse = await fetch(
        attentionIdToUse ? `/api/attentions/${attentionIdToUse}` : '/api/attentions',
        {
          method: attentionIdToUse ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(attentionPayload),
        }
      );

      const attentionData = await attentionResponse.json();
      if (!attentionResponse.ok) throw new Error(attentionData.msg || 'Error al guardar la atención principal.');
      
      if (!attentionIdToUse) attentionIdToUse = attentionData.attention.id;

      const savePromises = [];
      if (antecedentsFormRef.current) savePromises.push(antecedentsFormRef.current.save(patient.id));
      if (medicalHistoryDetailsFormRef.current) savePromises.push(medicalHistoryDetailsFormRef.current.save(attentionIdToUse));
      if (user.especialidades?.includes('Odontologia') && odontogramFormRef.current) savePromises.push(odontogramFormRef.current.save(attentionIdToUse));
      if (user.especialidades?.includes('Psicologia') && psychologyEvaluationFormRef.current) savePromises.push(psychologyEvaluationFormRef.current.save(attentionIdToUse));
      if (diagnosisManagementRef.current) savePromises.push(diagnosisManagementRef.current.save(attentionIdToUse, diagnoses));

      const results = await Promise.allSettled(savePromises);
      const errors = results.filter(r => r.status === 'rejected').map(r => r.reason.message).join('; ');

      if (errors) throw new Error(`Ocurrieron errores al guardar: ${errors}`);

      onSaveSuccess();

    } catch (err) {
      const errorMessage = err.message || 'No se pudo conectar con el servidor.';
      setError(errorMessage);
      onSaveError(errorMessage);
      setIsSaving(false);
    }
  };

  if (loadingInitialData || !patient) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      
      {/* HEADER CONTEXTUAL */}
      <Paper 
        elevation={0} 
        sx={{ 
            p: 3, mb: 4, borderRadius: 3, 
            bgcolor: '#e0f7fa', border: '1px solid #b2dfdb',
            display: 'flex', alignItems: 'center', gap: 2 
        }}
      >
          <Avatar sx={{ bgcolor: '#00695c', width: 56, height: 56 }}>
              <PersonIcon fontSize="large" />
          </Avatar>
          <Box>
              <Typography variant="h5" fontWeight="bold" color="#004d40">
                  {existingAttention ? 'Editando Atención' : 'Nueva Consulta'}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                  Paciente: <strong>{patient.nombre} {patient.apellido}</strong> — {patient.cedula}
              </Typography>
          </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSaveAll}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* 1. INFORMACIÓN GENERAL */}
            <Accordion defaultExpanded sx={{ borderRadius: '12px !important', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa', borderRadius: '12px 12px 0 0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospitalIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Motivo y Notas</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            name="motivo_consulta" label="Motivo de Consulta" fullWidth multiline rows={6} variant="outlined"
                            value={attentionFormState.motivo_consulta} onChange={handleAttentionFormChange} required
                            placeholder="Describe brevemente la razón de la visita..."
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            name="notas_generales" label="Notas Generales / Observaciones" fullWidth multiline rows={6} variant="outlined"
                            value={attentionFormState.notas_generales} onChange={handleAttentionFormChange}
                        />
                    </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* 2. ANTECEDENTES */}
            <Accordion sx={{ borderRadius: '12px !important', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa', borderRadius: '12px 12px 0 0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryEduIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Antecedentes Médicos</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <AntecedentsForm ref={antecedentsFormRef} patientId={patient.id} onDataChange={handleAntecedentsChange} />
              </AccordionDetails>
            </Accordion>

            {/* 3. EXAMEN FÍSICO */}
            <Accordion sx={{ borderRadius: '12px !important', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa', borderRadius: '12px 12px 0 0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Examen Físico y Detalles</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <MedicalHistoryDetailsForm ref={medicalHistoryDetailsFormRef} attentionId={currentAttentionId} onDataChange={handleMedicalHistoryDetailsChange} />
              </AccordionDetails>
            </Accordion>

            {/* MÓDULOS ESPECIALES */}
            {user && user.especialidades && user.especialidades.includes('Odontologia') && (
              <Accordion sx={{ borderRadius: '12px !important', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" color="primary">Odontograma</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <OdontogramForm attentionId={currentAttentionId} onDataChange={handleOdontogramChange} />
                </AccordionDetails>
              </Accordion>
            )}

            {user && user.especialidades && user.especialidades.includes('Psicologia') && (
              <Accordion sx={{ borderRadius: '12px !important', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PsychologyIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">Evaluación Psicológica</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                  <PsychologyEvaluationForm attentionId={currentAttentionId} onDataChange={handlePsychologyEvaluationChange} />
                </AccordionDetails>
              </Accordion>
            )}

            {/* 4. DIAGNÓSTICO */}
            <Accordion defaultExpanded sx={{ borderRadius: '12px !important', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa', borderRadius: '12px 12px 0 0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FactCheckIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Diagnósticos (CIE-10)</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <DiagnosisManagement ref={diagnosisManagementRef} attentionId={currentAttentionId} onDiagnosesChange={handleDiagnosesChange} />
              </AccordionDetails>
            </Accordion>

        </Box>

        {/* BARRA DE ACCIONES INFERIOR (Sticky) */}
        <Paper 
            elevation={10} 
            sx={{ 
                position: 'sticky', bottom: 20, mt: 4, p: 2, 
                borderRadius: 4, bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(5px)',
                display: 'flex', justifyContent: 'flex-end', gap: 2,
                border: '1px solid rgba(0,0,0,0.1)', zIndex: 1000
            }}
        >
            <Button 
                variant="outlined" 
                color="error" 
                size="large"
                onClick={onCancel} 
                disabled={isSaving}
                startIcon={<CancelIcon />}
                sx={{ borderRadius: 3 }}
            >
                Cancelar
            </Button>
            <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                size="large" 
                disabled={isSaving} 
                startIcon={!isSaving && <SaveIcon />}
                sx={{ borderRadius: 3, px: 4, fontWeight: 'bold' }}
            >
                {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Guardar Historia Clínica'}
            </Button>
        </Paper>
      </form>
    </Container>
  );
}

export default NewAttentionForm;