import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import PatientSearchAndSelection from './PatientSearchAndSelection';
import PatientDetailView from './PatientDetailView';
import NewAttentionForm from './NewAttentionForm';
import PatientAttentionList from './PatientAttentionList';
import PatientAttentionHistory from './PatientAttentionHistory';
import AttentionDetail from './AttentionDetail';

function AttentionManagement() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewMode, setViewMode] = useState('search');
  const [selectedAttention, setSelectedAttention] = useState(null);
  const [currentAppointmentId, setCurrentAppointmentId] = useState(null); // Nuevo estado para guardar el ID de la cita
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const appointmentData = location.state?.appointmentData;

    const fetchPatientAndGoToDetails = async (appointment) => {
      if (appointment && appointment.paciente_id) {
        try {
          // 1. Cargar datos del paciente
          const response = await fetch(`/api/patients/${appointment.paciente_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const patientData = await response.json();
          
          if (response.ok) {
            setSelectedPatient(patientData);
            setCurrentAppointmentId(appointment.id); // Guardamos el ID de la cita
            
            // 2. Actualizar estado de la cita a 'Atendiendo'
            // Solo si el estado actual no es 'Finalizada' o 'Pagada' (para evitar revertir estados si se recarga)
            if (appointment.estado_cita === 'En Sala de Espera') {
                await fetch(`/api/citas/${appointment.id}/estado`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ nuevo_estado: 'Atendiendo' }),
                });
            }

            // Decidir a qué vista ir basado en el targetView o por defecto a details
            if (location.state?.targetView === 'history') {
                setViewMode('history');
            } else {
                setViewMode('details');
            }
          } else {
            console.error('Error fetching patient data:', patientData.msg);
          }
        } catch (err) {
          console.error('Error fetching patient data:', err);
        }
      }
    };

    if (appointmentData) {
      fetchPatientAndGoToDetails(appointmentData);
      // Limpiar el estado de la ubicación para que no se reutilice
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, token, navigate]);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setCurrentAppointmentId(null); // Limpiamos el ID de cita si seleccionamos manualmente
    setViewMode('details');
  };

  const handleBackToSearch = () => {
    setSelectedPatient(null);
    setSelectedAttention(null);
    setCurrentAppointmentId(null);
    setViewMode('search');
  };

  const handleBackToDetails = () => {
    setSelectedAttention(null);
    setViewMode('details');
  };

  const handleNewAttention = () => {
    setSelectedAttention(null);
    setViewMode('newAttention');
  };

  const handleEditAttention = (attention) => {
    setSelectedAttention(attention);
    setViewMode('newAttention');
  };

  const handleEditAttentions = () => {
    setViewMode('editAttentions');
  };

  const handleShowHistory = () => {
    setViewMode('history');
  };

  const handleAttentionSaveSuccess = () => {
    setTimeout(() => {
      setViewMode('details');
      setNotification({ open: true, message: 'Atención guardada exitosamente.', severity: 'success' });
      // Opcional: Limpiar el appointment ID después de guardar exitosamente, 
      // si queremos que futuras atenciones para este paciente en esta sesión no se liguen a la misma cita.
      setCurrentAppointmentId(null); 
    }, 0);
  };

  const handleShowAttentionDetails = (attention) => {
    setSelectedAttention(attention);
    setViewMode('attentionDetail');
  };

  const handleBackToHistory = () => {
    setViewMode('history');
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'search':
        return <PatientSearchAndSelection onPatientSelect={handlePatientSelect} />;
      case 'details':
        return (
          <Box>
            <Button variant="contained" onClick={handleBackToSearch} sx={{ mb: 2 }}>
              Volver a la búsqueda
            </Button>
            <PatientDetailView
              patient={selectedPatient}
              onNewAttention={handleNewAttention}
              onEditAttentions={handleEditAttentions}
              onShowHistory={handleShowHistory}
            />
          </Box>
        );
      case 'newAttention':
        return (
          <NewAttentionForm
            patient={selectedPatient}
            attention={selectedAttention}
            onSaveSuccess={handleAttentionSaveSuccess}
            onCancel={handleBackToDetails}
            citaId={currentAppointmentId} // Pasamos el ID de la cita
          />
        );
      case 'editAttentions':
        return (
          <PatientAttentionList
            patient={selectedPatient}
            onEditAttention={handleEditAttention}
            onBack={handleBackToDetails}
          />
        );
      case 'history':
        return (
          <PatientAttentionHistory
            patient={selectedPatient}
            patientId={selectedPatient.id}
            onShowAttentionDetails={handleShowAttentionDetails}
            onBack={handleBackToDetails}
          />
        );
      case 'attentionDetail':
        return (
          <AttentionDetail
            attention={selectedAttention}
            onBack={handleBackToHistory}
          />
        );
      default:
        return <PatientSearchAndSelection onPatientSelect={handlePatientSelect} />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
      {renderContent()}
    </Container>
  );
}

export default AttentionManagement;