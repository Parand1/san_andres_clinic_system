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
  OutlinedInput,
  Chip,
  CircularProgress,
  InputAdornment,
  Avatar,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
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

function ProfessionalManagement() {
  const { token, user } = useAuth();
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [allSpecialties, setAllSpecialties] = useState([]); 
  const [selectedSpecialties, setSelectedSpecialties] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [currentProfessional, setCurrentProfessional] = useState(null);
  const [formState, setFormState] = useState({
    cedula: '',
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'profesional',
  });

  const fetchProfessionalsAndSpecialties = async () => {
    setLoading(true);
    setError('');
    try {
      const [professionalsResponse, specialtiesResponse] = await Promise.all([
        fetch(`/api/professionals?_t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
          cache: 'no-store',
        }),
        fetch(`/api/specialties/all?_t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
          cache: 'no-store',
        }),
      ]);

      let professionalsData = [];
      if (professionalsResponse.ok) {
        if (professionalsResponse.status !== 204 && professionalsResponse.status !== 304) {
          professionalsData = await professionalsResponse.json();
        }
        setProfessionals(professionalsData);
        setFilteredProfessionals(professionalsData);
      }

      let specialtiesData = [];
      if (specialtiesResponse.ok) {
        if (specialtiesResponse.status !== 204 && specialtiesResponse.status !== 304) {
          specialtiesData = await specialtiesResponse.json();
        }
        setAllSpecialties(specialtiesData);
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user && user.rol === 'admin') {
      fetchProfessionalsAndSpecialties();
    }
  }, [token, user]);

  useEffect(() => {
    const results = professionals.filter(p =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cedula.includes(searchTerm)
    );
    setFilteredProfessionals(results);
  }, [searchTerm, professionals]);

  const handleOpenAddDialog = () => {
    setCurrentProfessional(null);
    setFormState({
      cedula: '',
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      rol: 'profesional',
    });
    setSelectedSpecialties([]);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = async (professional) => {
    setCurrentProfessional(professional);
    setFormState({
      cedula: professional.cedula,
      nombre: professional.nombre,
      apellido: professional.apellido,
      email: professional.email,
      password: '', 
      rol: professional.rol,
    });

    try {
      const response = await fetch(`/api/specialties/${professional.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedSpecialties(data.map(s => s.id));
      } else {
        setSelectedSpecialties([]);
      }
    } catch (err) {
      setSelectedSpecialties([]);
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(''); setSuccess('');
  };

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSpecialtyChange = (e) => {
    const { value } = e.target;
    setSelectedSpecialties(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSaveProfessional = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const method = currentProfessional ? 'PUT' : 'POST';
    const url = currentProfessional
      ? `/api/professionals/${currentProfessional.id}`
      : '/api/auth/register';

    try {
      const professionalPayload = { ...formState };
      if (method === 'PUT' && professionalPayload.password === '') {
        delete professionalPayload.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(professionalPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.msg || 'Operación exitosa.');
        const professionalIdToAssign = currentProfessional ? currentProfessional.id : data.user.id;

        await fetch(`/api/specialties/${professionalIdToAssign}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ specialty_ids: selectedSpecialties }),
        });

        fetchProfessionalsAndSpecialties();
        handleCloseDialog();
      } else {
        setError(data.msg || 'Error al guardar profesional.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  const handleDeleteProfessional = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este profesional?')) return;
    try {
      const response = await fetch(`/api/professionals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.msg || 'Eliminado exitosamente.');
        fetchProfessionalsAndSpecialties();
      } else {
        setError(data.msg || 'Error al eliminar.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary">
            Equipo Médico
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
            Administración de personal
            </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          sx={{ borderRadius: 2, px: 3, py: 1, boxShadow: '0 4px 12px rgba(0, 167, 157, 0.3)' }}
        >
          Nuevo Profesional
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: 3, bgcolor: '#f5f5f5', border: '1px solid rgba(0,0,0,0.05)' }}>
        <TextField
            fullWidth
            placeholder="Buscar por nombre, cédula o correo..."
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
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>PROFESIONAL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>CÉDULA</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>EMAIL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>ROL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>ESPECIALIDADES</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#666' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProfessionals.map((pro) => (
              <TableRow key={pro.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s' }}>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                            sx={{ 
                                bgcolor: stringToColor(pro.nombre + pro.apellido),
                                width: 40, height: 40, fontSize: '1rem'
                            }}
                        >
                            {pro.nombre[0]}{pro.apellido[0]}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {pro.nombre} {pro.apellido}
                            </Typography>
                        </Box>
                    </Box>
                </TableCell>
                <TableCell>{pro.cedula}</TableCell>
                <TableCell>{pro.email}</TableCell>
                <TableCell>
                    <Chip 
                        label={pro.rol} 
                        size="small" 
                        color={pro.rol === 'admin' ? 'error' : pro.rol === 'secretaria' ? 'secondary' : 'primary'}
                        variant={pro.rol === 'profesional' ? 'outlined' : 'filled'}
                        sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                    />
                </TableCell>
                <TableCell>
                  {pro.especialidades && pro.especialidades.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {pro.especialidades.map(s => (
                            <Chip key={s.id} label={s.nombre} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0' }} />
                        ))}
                      </Box>
                  ) : (
                      <Typography variant="caption" color="text.secondary">N/A</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar">
                    <IconButton color="primary" onClick={() => handleOpenEditDialog(pro)}>
                        <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton color="error" onClick={() => handleDeleteProfessional(pro.id)}>
                        <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredProfessionals.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography variant="body1" color="text.secondary">No se encontraron profesionales.</Typography>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DIÁLOGO */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontWeight: 'bold' }}>{currentProfessional ? 'Editar Profesional' : 'Nuevo Profesional'}</DialogTitle>
          <DialogContent dividers>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField name="cedula" label="Cédula" fullWidth value={formState.cedula} onChange={handleChange} required />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField name="nombre" label="Nombre" fullWidth value={formState.nombre} onChange={handleChange} required />
                    <TextField name="apellido" label="Apellido" fullWidth value={formState.apellido} onChange={handleChange} required />
                </Box>
                <TextField name="email" label="Correo Electrónico" type="email" fullWidth value={formState.email} onChange={handleChange} required />
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Rol</InputLabel>
                        <Select name="rol" value={formState.rol} label="Rol" onChange={handleChange}>
                            <MenuItem value="profesional">Profesional</MenuItem>
                            <MenuItem value="secretaria">Secretaria</MenuItem>
                            <MenuItem value="admin">Administrador</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField name="password" label="Contraseña" type="password" fullWidth value={formState.password} onChange={handleChange} placeholder={currentProfessional ? "Opcional" : "Requerido"} />
                </Box>

                <FormControl fullWidth>
                    <InputLabel>Especialidades</InputLabel>
                    <Select
                        multiple
                        value={selectedSpecialties}
                        onChange={handleSpecialtyChange}
                        input={<OutlinedInput label="Especialidades" />}
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                    <Chip key={value} label={allSpecialties.find(s => s.id === value)?.nombre || value} size="small" />
                                ))}
                            </Box>
                        )}
                    >
                        {allSpecialties.map((specialty) => (
                            <MenuItem key={specialty.id} value={specialty.id}>{specialty.nombre}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSaveProfessional} variant="contained">Guardar</Button>
          </DialogActions>
        </Dialog>
    </Container>
  );
}

export default ProfessionalManagement;