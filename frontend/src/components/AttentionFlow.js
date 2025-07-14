import React, { useState } from 'react';
import { Button, Alert, Snackbar } from '@mui/material'; // Importar Alert y Snackbar
import PatientSearchAndSelection from './PatientSearchAndSelection';
import PatientDetailView from './PatientDetailView';
import NewAttentionForm from './NewAttentionForm';
import PatientAttentionList from './PatientAttentionList';
import PatientAttentionHistory from './PatientAttentionHistory';

function AttentionFlow() {
  const [currentView, setCurrentView] = useState('SEARCH'); // SEARCH, DETAIL, NEW_ATTENTION, EDIT_ATTENTIONS, HISTORY
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAttention, setSelectedAttention] = useState(null);
  // Estado centralizado para notificaciones
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setCurrentView('DETAIL');
  };

  const handleNewAttention = () => {
    setSelectedAttention(null);
    setCurrentView('NEW_ATTENTION');
  };

  const handleEditAttention = (attention) => {
    setSelectedAttention(attention);
    setCurrentView('NEW_ATTENTION');
  };

  const handleEditAttentions = () => {
    setCurrentView('EDIT_ATTENTIONS');
  };

  const handleShowHistory = () => {
    setCurrentView('HISTORY');
  };

  const handleBackToSearch = () => {
    setSelectedPatient(null);
    setSelectedAttention(null);
    setCurrentView('SEARCH');
  };

  const handleBackToDetail = () => {
    setSelectedAttention(null);
    setCurrentView('DETAIL');
  };

  // El formulario hijo llamará a esta función en caso de éxito
  const handleSaveSuccess = () => {
    console.log('[AttentionFlow] handleSaveSuccess: Iniciando cambio de vista a DETAIL.');
    setCurrentView('DETAIL');
    setNotification({ open: true, message: '¡Historia Clínica guardada con éxito!', severity: 'success' });
    console.log('[AttentionFlow] handleSaveSuccess: Cambio de vista y notificación solicitados.');
  };

  // El formulario hijo llamará a esta función en caso de error
  const handleSaveError = (errorMessage) => {
    // El error se muestra en el mismo formulario, así que esta función podría no ser necesaria
    // pero la dejamos por si queremos cambiar el comportamiento en el futuro.
    // Por ahora, la notificación de error se queda en NewAttentionForm.
  };
  
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const renderContent = () => {
    switch (currentView) {
      case 'SEARCH':
        return <PatientSearchAndSelection onPatientSelect={handlePatientSelect} />;
      case 'DETAIL':
        return (
          <>
            <Button onClick={handleBackToSearch} sx={{ mb: 2 }}>Volver a la búsqueda</Button>
            <PatientDetailView
              patient={selectedPatient}
              onNewAttention={handleNewAttention}
              onEditAttentions={handleEditAttentions}
              onShowHistory={handleShowHistory}
            />
          </>
        );
      case 'NEW_ATTENTION':
        return (
          <NewAttentionForm
            patient={selectedPatient}
            attention={selectedAttention}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError} // Pasamos la nueva función de error
            onCancel={handleBackToDetail}
          />
        );
      case 'EDIT_ATTENTIONS':
        return (
          <>
            <Button onClick={handleBackToDetail} sx={{ mb: 2 }}>Volver a Detalles</Button>
            <PatientAttentionList
              patient={selectedPatient}
              onEditAttention={handleEditAttention}
            />
          </>
        );
      case 'HISTORY':
        return (
          <>
            <Button onClick={handleBackToDetail} sx={{ mb: 2 }}>Volver a Detalles</Button>
            <PatientAttentionHistory patientId={selectedPatient.id} />
          </>
        );
      default:
        return <PatientSearchAndSelection onPatientSelect={handlePatientSelect} />;
    }
  };

  return (
    <div>
      {/* Snackbar para mostrar notificaciones de forma centralizada */}
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
    </div>
  );
}

export default AttentionFlow;
