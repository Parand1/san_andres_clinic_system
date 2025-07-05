import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
} from '@mui/material';
import PatientSearchAndSelection from './PatientSearchAndSelection';
import PatientDetailView from './PatientDetailView';
import NewAttentionForm from './NewAttentionForm';
import PatientAttentionList from './PatientAttentionList';
import PatientAttentionHistory from './PatientAttentionHistory';

function AttentionManagement() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewMode, setViewMode] = useState('search'); // 'search', 'details', 'newAttention', 'editAttentions', 'history'

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setViewMode('details');
  };

  const handleBackToDetails = () => {
    setViewMode('details');
  };

  const handleNewAttention = () => {
    setViewMode('newAttention');
  };

  const handleEditAttentions = () => {
    setViewMode('editAttentions');
  };

  const handleShowHistory = () => {
    setViewMode('history');
  };

  const handleAttentionSaveSuccess = () => {
    // Después de guardar una atención, podemos volver a la vista de detalles del paciente
    setViewMode('details');
    // Opcional: recargar los detalles del paciente si es necesario
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'search':
        return <PatientSearchAndSelection onPatientSelect={handlePatientSelect} />;
      case 'details':
        return selectedPatient ? (
          <PatientDetailView
            patient={selectedPatient}
            onNewAttention={handleNewAttention}
            onEditAttentions={handleEditAttentions}
            onShowHistory={handleShowHistory}
          />
        ) : (
          <Typography variant="h6" align="center" sx={{ mt: 4 }}>
            No hay paciente seleccionado. Por favor, busque uno.
          </Typography>
        );
      case 'newAttention':
        return selectedPatient ? (
          <NewAttentionForm
            patient={selectedPatient}
            onSaveSuccess={handleAttentionSaveSuccess}
            onCancel={handleBackToDetails}
          />
        ) : (
          <Typography variant="h6" align="center" sx={{ mt: 4 }}>
            No hay paciente seleccionado para registrar una nueva atención.
          </Typography>
        );
      case 'editAttentions':
        return selectedPatient ? (
          <PatientAttentionList
            patient={selectedPatient} // Pasar el objeto completo
            patientId={selectedPatient.id}
            onBack={handleBackToDetails}
          />
        ) : (
          <Typography variant="h6" align="center" sx={{ mt: 4 }}>
            No hay paciente seleccionado para editar atenciones.
          </Typography>
        );
      case 'history':
        return selectedPatient ? (
          <PatientAttentionHistory
            patientId={selectedPatient.id}
            onBack={handleBackToDetails}
          />
        ) : (
          <Typography variant="h6" align="center" sx={{ mt: 4 }}>
            No hay paciente seleccionado para ver el historial.
          </Typography>
        );
      default:
        return <PatientSearchAndSelection onPatientSelect={handlePatientSelect} />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {renderContent()}
    </Container>
  );
}

export default AttentionManagement;
