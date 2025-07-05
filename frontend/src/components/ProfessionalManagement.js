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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../AuthContext';

function ProfessionalManagement() {
  const { token, user } = useAuth();
  const [professionals, setProfessionals] = useState([]);
  const [allSpecialties, setAllSpecialties] = useState([]); // Todas las especialidades disponibles
  const [selectedSpecialties, setSelectedSpecialties] = useState([]); // Especialidades del profesional actual
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // Fetch de profesionales y especialidades
  const fetchProfessionalsAndSpecialties = async () => {
    setLoading(true);
    setError('');
    try {
      const [professionalsResponse, specialtiesResponse] = await Promise.all([
        fetch('http://localhost:5000/api/professionals', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/professional-specialties/all', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const professionalsData = await professionalsResponse.json();
      const specialtiesData = await specialtiesResponse.json();

      if (professionalsResponse.ok) {
        setProfessionals(professionalsData);
      } else {
        setError(professionalsData.msg || 'Error al cargar profesionales.');
      }

      if (specialtiesResponse.ok) {
        setAllSpecialties(specialtiesData);
      } else {
        setError(specialtiesData.msg || 'Error al cargar especialidades.');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor para cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user && user.rol === 'admin') {
      fetchProfessionalsAndSpecialties();
    }
  }, [token, user]);

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
    setSelectedSpecialties([]); // Limpiar especialidades seleccionadas
    setOpenDialog(true);
  };

  const handleOpenEditDialog = async (professional) => {
    setCurrentProfessional(professional);
    setFormState({
      cedula: professional.cedula,
      nombre: professional.nombre,
      apellido: professional.apellido,
      email: professional.email,
      password: '', // No precargar contraseña por seguridad
      rol: professional.rol,
    });

    // Cargar especialidades del profesional para edición
    try {
      const response = await fetch(`http://localhost:5000/api/professional-specialties/${professional.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedSpecialties(data.map(s => s.id)); // Guardar solo los IDs
      } else {
        console.error('Error al cargar especialidades del profesional:', data.msg);
        setSelectedSpecialties([]);
      }
    } catch (err) {
      console.error('Error de red al cargar especialidades del profesional:', err);
      setSelectedSpecialties([]);
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');    setSuccess('');
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
      ? `http://localhost:5000/api/professionals/${currentProfessional.id}`
      : 'http://localhost:5000/api/auth/register';

    try {
      const professionalPayload = { ...formState };
      // No enviar password si está vacío y es una edición
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
        const professionalIdToAssign = currentProfessional ? currentProfessional.id : data.user.id; // Obtener ID del profesional

        // Asignar especialidades
        const assignSpecialtiesResponse = await fetch(`http://localhost:5000/api/professional-specialties/${professionalIdToAssign}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ specialty_ids: selectedSpecialties }),
        });

        if (!assignSpecialtiesResponse.ok) {
          const assignSpecialtiesData = await assignSpecialtiesResponse.json();
          console.error('Error al asignar especialidades:', assignSpecialtiesData.msg);
          setError(assignSpecialtiesData.msg || 'Error al asignar especialidades.');
        }

        fetchProfessionalsAndSpecialties(); // Recargar la lista
        handleCloseDialog();
      } else {
        setError(data.msg || 'Error al guardar profesional.');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor.');
    }
  };

  const handleDeleteProfessional = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este profesional?')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`http://localhost:5000/api/professionals/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.msg || 'Profesional eliminado exitosamente.');
        fetchProfessionalsAndSpecialties(); // Recargar la lista
      } else {
        setError(data.msg || 'Error al eliminar profesional.');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor para eliminar.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Cargando profesionales...</Typography>
      </Container>
    );
  }

  if (error && !openDialog) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Profesionales
        </Typography>
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          sx={{ mb: 2 }}
        >
          Agregar Profesional
        </Button>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Cédula</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Apellido</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Especialidades</TableCell> {/* Nueva columna */}
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {professionals.map((professional) => (
                <TableRow
                  key={professional.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {professional.cedula}
                  </TableCell>
                  <TableCell>{professional.nombre}</TableCell>
                  <TableCell>{professional.apellido}</TableCell>
                  <TableCell>{professional.email}</TableCell>
                  <TableCell>{professional.rol}</TableCell>
                  <TableCell>
                    {professional.especialidades && professional.especialidades.map(s => (
                      <Chip key={s.id} label={s.nombre} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEditDialog(professional)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteProfessional(professional.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Diálogo para Agregar/Editar Profesional */}
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle>{currentProfessional ? 'Editar Profesional' : 'Agregar Profesional'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              autoFocus
              margin="dense"
              name="cedula"
              label="Cédula"
              type="text"
              fullWidth
              variant="standard"
              value={formState.cedula}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              name="nombre"
              label="Nombre"
              type="text"
              fullWidth
              variant="standard"
              value={formState.nombre}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              name="apellido"
              label="Apellido"
              type="text"
              fullWidth
              variant="standard"
              value={formState.apellido}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              name="email"
              label="Correo Electrónico"
              type="email"
              fullWidth
              variant="standard"
              value={formState.email}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              name="password"
              label="Contraseña" // Solo se muestra para agregar o si se quiere cambiar
              type="password"
              fullWidth
              variant="standard"
              value={formState.password}
              onChange={handleChange}
              {...(currentProfessional ? {} : { required: true })} // Requerido solo al agregar
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="rol-label">Rol</InputLabel>
              <Select
                labelId="rol-label"
                id="rol"
                name="rol"
                value={formState.rol}
                label="Rol"
                onChange={handleChange}
              >
                <MenuItem value="profesional">Profesional</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel id="specialties-label">Especialidades</InputLabel>
              <Select
                labelId="specialties-label"
                id="specialties"
                multiple
                value={selectedSpecialties}
                onChange={handleSpecialtyChange}
                input={<OutlinedInput id="select-multiple-chip" label="Especialidades" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={allSpecialties.find(s => s.id === value)?.nombre || value} />
                    ))}
                  </Box>
                )}
              >
                {allSpecialties.map((specialty) => (
                  <MenuItem key={specialty.id} value={specialty.id}>
                    {specialty.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSaveProfessional} variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

export default ProfessionalManagement;
