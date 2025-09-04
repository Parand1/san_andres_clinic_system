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
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const appointmentData = location.state?.appointmentData;

    const fetchPatientAndGoToDetails = async (appointment) => {
      if (appointment && appointment.paciente_id) {
        try {
          const response = await fetch(`/api/patients/${appointment.paciente_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const patientData = await response.json();
          if (response.ok) {
            setSelectedPatient(patientData);
            setViewMode('details'); // Cambiado a 'details'
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
    setViewMode('details');
  };

  const handleBackToSearch = () => {
    setSelectedPatient(null);
    setSelectedAttention(null);
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