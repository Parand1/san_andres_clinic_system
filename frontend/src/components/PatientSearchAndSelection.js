import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Paper,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../AuthContext';

function PatientSearchAndSelection({ onPatientSelect }) {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounce for search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Fetch patients based on debounced search term
  useEffect(() => {
    const fetchPatients = async () => {
      if (!debouncedSearchTerm) {
        setPatients([]);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/patients?search=${encodeURIComponent(debouncedSearchTerm)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setPatients(data);
        } else {
          setError(data.msg || 'Error al buscar pacientes.');
        }
      } catch (err) {
        console.error('Error de red:', err);
        setError('No se pudo conectar con el servidor para buscar pacientes.');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [debouncedSearchTerm, token]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Buscar Paciente
        </Typography>
        <TextField
          label="Cédula, Nombre, Apellido o Email del Paciente"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {loading && <Typography align="center">Buscando...</Typography>}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && patients.length === 0 && debouncedSearchTerm && (
          <Typography align="center" sx={{ mt: 2 }}>
            No se encontraron pacientes.
          </Typography>
        )}

        {!loading && patients.length > 0 && (
          <Paper elevation={3} sx={{ mt: 2 }}>
            <List>
              {patients.map((patient) => (
                <ListItem key={patient.id} disablePadding>
                  <ListItemButton onClick={() => onPatientSelect(patient)}>
                    <ListItemText
                      primary={`${patient.nombre} ${patient.apellido} (${patient.cedula})`}
                      secondary={`Email: ${patient.email || 'N/A'} | Teléfono: ${patient.telefono || 'N/A'}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

export default PatientSearchAndSelection;
