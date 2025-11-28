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
  Avatar,
  CircularProgress,
  ListItemAvatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { useAuth } from '../AuthContext';

// Función auxiliar para color de avatar
function stringToColor(string) {
  let hash = 0;
  let i;
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.substr(-2);
  }
  return color;
}

function PatientSearchAndSelection({ onPatientSelect }) {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

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
        setError('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [debouncedSearchTerm, token]);

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
            p: 6, 
            borderRadius: 4, 
            textAlign: 'center',
            background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)'
        }}
      >
        <PersonSearchIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2, opacity: 0.8 }} />
        
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom color="text.primary">
          Iniciar Atención
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Busca al paciente por nombre, cédula o correo electrónico para comenzar.
        </Typography>

        <TextField
          placeholder="Ej: Juan Pérez o 172..."
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            style: { borderRadius: 12, backgroundColor: '#fff' }
          }}
          sx={{ 
              maxWidth: 600, 
              mb: 4,
              '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.3s',
                  '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.08)' },
                  '&.Mui-focused': { boxShadow: '0 6px 20px rgba(0, 167, 157, 0.15)' }
              }
          }}
        />

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}>{error}</Alert>}

        {!loading && !error && patients.length === 0 && debouncedSearchTerm && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No se encontraron pacientes con ese criterio.
          </Typography>
        )}

        {!loading && patients.length > 0 && (
          <Paper elevation={0} variant="outlined" sx={{ maxWidth: 600, mx: 'auto', borderRadius: 3, overflow: 'hidden' }}>
            <List sx={{ p: 0 }}>
              {patients.map((patient, index) => (
                <React.Fragment key={patient.id}>
                    {index > 0 && <Box sx={{ borderTop: '1px solid #f0f0f0' }} />}
                    <ListItem disablePadding>
                    <ListItemButton onClick={() => onPatientSelect(patient)} sx={{ py: 2 }}>
                        <ListItemAvatar>
                            <Avatar sx={{ bgcolor: stringToColor(patient.nombre + patient.apellido) }}>
                                {patient.nombre[0]}{patient.apellido[0]}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                        primary={
                            <Typography variant="subtitle1" fontWeight="bold">
                                {patient.nombre} {patient.apellido}
                            </Typography>
                        }
                        secondary={
                            <Typography variant="body2" color="text.secondary">
                                {patient.cedula} • {patient.email || 'Sin email'}
                            </Typography>
                        }
                        />
                    </ListItemButton>
                    </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Paper>
    </Container>
  );
}

export default PatientSearchAndSelection;