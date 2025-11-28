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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Avatar,
  Chip,
  Tooltip,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import { useAuth } from '../AuthContext';

// Función para generar color de avatar basado en el nombre
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

function PatientManagement() {
  const { token, user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [formState, setFormState] = useState({
    cedula: '',
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    genero: '',
    telefono: '',
    direccion: '',
    email: '',
  });

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const fetchPatients = async (currentSearchTerm) => {
    setLoading(true);
    setError('');
    try {
      const url = currentSearchTerm
        ? `/api/patients?search=${encodeURIComponent(currentSearchTerm)}`
        : '/api/patients';

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setPatients(data);
      } else {
        setError(data.msg || 'Error al cargar pacientes.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchPatients(debouncedSearchTerm);
    }
  }, [token, user, debouncedSearchTerm]);

  const handleOpenAddDialog = () => {
    setCurrentPatient(null);
    setFormState({
      cedula: '',
      nombre: '',
      apellido: '',
      fecha_nacimiento: '',
      genero: '',
      telefono: '',
      direccion: '',
      email: '',
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (patient) => {
    setCurrentPatient(patient);
    setFormState({
      cedula: patient.cedula,
      nombre: patient.nombre,
      apellido: patient.apellido,
      fecha_nacimiento: patient.fecha_nacimiento ? patient.fecha_nacimiento.split('T')[0] : '',
      genero: patient.genero || '',
      telefono: patient.telefono || '',
      direccion: patient.direccion || '',
      email: patient.email || '',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(''); setSuccess('');
  };

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    const method = currentPatient ? 'PUT' : 'POST';
    const url = currentPatient ? `/api/patients/${currentPatient.id}` : '/api/patients';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formState),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.msg || 'Operación exitosa.');
        fetchPatients(debouncedSearchTerm);
        handleCloseDialog();
      } else {
        setError(data.msg || 'Error al guardar paciente.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  const handleDeletePatient = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este paciente?')) return;
    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.msg || 'Paciente eliminado.');
        fetchPatients(debouncedSearchTerm);
      } else {
        setError(data.msg || 'Error al eliminar.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  if (loading && patients.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary">
            Directorio de Pacientes
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
            Administración de historias y datos personales
            </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          sx={{ borderRadius: 2, px: 3, py: 1, boxShadow: '0 4px 12px rgba(0, 167, 157, 0.3)' }}
        >
          Nuevo Paciente
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* BUSCADOR */}
      <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: 3, bgcolor: '#f5f5f5', border: '1px solid rgba(0,0,0,0.05)' }}>
        <TextField
            fullWidth
            placeholder="Buscar paciente por nombre, cédula o email..."
            variant="standard"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
                disableUnderline: true,
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon color="action" />
                    </InputAdornment>
                ),
                style: { fontSize: '1.1rem' }
            }}
        />
      </Paper>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: '#f9fafb' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>PACIENTE</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>CONTACTO</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>GÉNERO</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>NACIMIENTO</TableCell>
              {user && user.rol === 'admin' && <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>AUDITORÍA</TableCell>}
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#666' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s' }}>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                            sx={{ 
                                bgcolor: stringToColor(patient.nombre + patient.apellido),
                                width: 40, height: 40, fontSize: '1rem'
                            }}
                        >
                            {patient.nombre[0]}{patient.apellido[0]}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {patient.nombre} {patient.apellido}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.8rem' }}>
                                <BadgeIcon fontSize="inherit" /> {patient.cedula}
                            </Box>
                        </Box>
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
                            <PhoneIcon fontSize="inherit" color="action" /> {patient.telefono || '-'}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
                            <EmailIcon fontSize="inherit" color="action" /> {patient.email || '-'}
                        </Box>
                    </Box>
                </TableCell>
                <TableCell>
                    <Chip 
                        label={patient.genero || 'N/A'} 
                        size="small" 
                        variant="outlined"
                        color={patient.genero === 'Femenino' ? 'secondary' : patient.genero === 'Masculino' ? 'primary' : 'default'}
                    />
                </TableCell>
                <TableCell>
                    {patient.fecha_nacimiento ? new Date(patient.fecha_nacimiento).toLocaleDateString() : 'N/A'}
                </TableCell>
                
                {user && user.rol === 'admin' && (
                    <TableCell>
                       <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                           <Typography variant="caption" display="block">
                               <strong>Creado:</strong> {new Date(patient.fecha_creacion).toLocaleDateString()} 
                               {patient.created_by_nombre && ` por ${patient.created_by_nombre} ${patient.created_by_apellido}`}
                           </Typography>
                           {patient.updated_at && (
                               <Typography variant="caption" display="block">
                                   <strong>Editado:</strong> {new Date(patient.updated_at).toLocaleDateString()}
                                   {patient.updated_by_nombre && ` por ${patient.updated_by_nombre} ${patient.updated_by_apellido}`}
                               </Typography>
                           )}
                       </Box>
                    </TableCell>
                )}

                <TableCell align="center">
                  <Tooltip title="Editar">
                    <IconButton color="primary" onClick={() => handleOpenEditDialog(patient)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  {user && user.rol === 'admin' && (
                    <Tooltip title="Eliminar">
                        <IconButton color="error" onClick={() => handleDeletePatient(patient.id)}>
                        <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {patients.length === 0 && !loading && (
                <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography variant="body1" color="text.secondary">No se encontraron pacientes.</Typography>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DIÁLOGO MEJORADO (STACK LAYOUT) */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
          <DialogTitle sx={{ fontWeight: 'bold', pb: 1, borderBottom: '1px solid #eee' }}>
              {currentPatient ? 'Editar Información del Paciente' : 'Registrar Nuevo Paciente'}
          </DialogTitle>
          
          <DialogContent sx={{ p: 4 }}>
            <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
                <Stack spacing={3}>
                    
                    {/* SECCIÓN 1 */}
                    <Box>
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Datos Personales
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField 
                                name="cedula" label="Cédula de Identidad" fullWidth variant="outlined" 
                                value={formState.cedula} onChange={handleChange} required 
                            />
                            <TextField 
                                name="fecha_nacimiento" label="Fecha de Nacimiento" type="date" fullWidth variant="outlined" 
                                InputLabelProps={{ shrink: true }} 
                                value={formState.fecha_nacimiento} onChange={handleChange} 
                            />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                            <TextField 
                                name="nombre" label="Nombres" fullWidth variant="outlined" 
                                value={formState.nombre} onChange={handleChange} required 
                            />
                            <TextField 
                                name="apellido" label="Apellidos" fullWidth variant="outlined" 
                                value={formState.apellido} onChange={handleChange} required 
                            />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="genero-label">Género</InputLabel>
                                <Select 
                                    labelId="genero-label" name="genero" value={formState.genero} onChange={handleChange} label="Género"
                                >
                                    <MenuItem value=""><em>Seleccionar</em></MenuItem>
                                    <MenuItem value="Masculino">Masculino</MenuItem>
                                    <MenuItem value="Femenino">Femenino</MenuItem>
                                    <MenuItem value="Otro">Otro</MenuItem>
                                </Select>
                            </FormControl>
                            <Box sx={{ width: '100%' }} /> 
                        </Stack>
                    </Box>

                    <Divider />

                    {/* SECCIÓN 2 */}
                    <Box>
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Información de Contacto
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField 
                                name="telefono" label="Teléfono / Celular" fullWidth variant="outlined" 
                                value={formState.telefono} onChange={handleChange} 
                            />
                            <TextField 
                                name="email" label="Correo Electrónico" type="email" fullWidth variant="outlined" 
                                value={formState.email} onChange={handleChange} 
                            />
                        </Stack>
                        <Box sx={{ mt: 2 }}>
                            <TextField 
                                name="direccion" label="Dirección Domiciliaria" fullWidth variant="outlined" multiline rows={2}
                                value={formState.direccion} onChange={handleChange} 
                            />
                        </Box>
                    </Box>

                </Stack>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, borderTop: '1px solid #eee', bgcolor: '#fafafa' }}>
            <Button onClick={handleCloseDialog} variant="outlined" color="inherit" sx={{ mr: 1 }}>Cancelar</Button>
            <Button onClick={handleSavePatient} variant="contained" color="primary" size="large" sx={{ px: 4 }}>
                {currentPatient ? 'Guardar Cambios' : 'Registrar Paciente'}
            </Button>
          </DialogActions>
        </Dialog>
    </Container>
  );
}

export default PatientManagement;