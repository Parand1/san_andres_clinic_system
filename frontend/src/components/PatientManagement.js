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
  InputAdornment, // Nuevo
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search'; // Nuevo
import { useAuth } from '../AuthContext';

function PatientManagement() {
  const { token, user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // Nuevo estado para el término de búsqueda con debounce

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

  // Efecto para el debounce del término de búsqueda
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms de retardo

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  const fetchPatients = async (currentSearchTerm) => { // Aceptar el término de búsqueda como argumento
    setLoading(true);
    setError('');
    try {
      const url = currentSearchTerm
        ? `http://localhost:5000/api/patients?search=${encodeURIComponent(currentSearchTerm)}`
        : 'http://localhost:5000/api/patients';

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setPatients(data);
      } else {
        setError(data.msg || 'Error al cargar pacientes.');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor para cargar pacientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchPatients(debouncedSearchTerm); // Usar el término de búsqueda con debounce
    }
  }, [token, user, debouncedSearchTerm]); // Depender del término de búsqueda con debounce

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
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const method = currentPatient ? 'PUT' : 'POST';
    const url = currentPatient
      ? `http://localhost:5000/api/patients/${currentPatient.id}`
      : 'http://localhost:5000/api/patients';

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
        fetchPatients(debouncedSearchTerm); // Recargar la lista con el término de búsqueda actual
        handleCloseDialog();
      } else {
        setError(data.msg || 'Error al guardar paciente.');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor.');
    }
  };

  const handleDeletePatient = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este paciente? Esta acción es irreversible.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`http://localhost:5000/api/patients/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.msg || 'Paciente eliminado exitosamente.');
        fetchPatients(debouncedSearchTerm); // Recargar la lista con el término de búsqueda actual
      } else {
        setError(data.msg || 'Error al eliminar paciente.');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('No se pudo conectar con el servidor para eliminar.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Cargando pacientes...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Pacientes
        </Typography>
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <TextField
            label="Buscar paciente"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: '300px' }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Agregar Paciente
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Cédula</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Apellido</TableCell>
                <TableCell>Fecha Nac.</TableCell>
                <TableCell>Género</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Email</TableCell>
                {user && user.rol === 'admin' && ( // Condicional para admin
                  <>
                    <TableCell>Creado por</TableCell>
                    <TableCell>Última Modificación</TableCell>
                  </>
                )}
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.map((patient) => (
                <TableRow
                  key={patient.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {patient.cedula}
                  </TableCell>
                  <TableCell>{patient.nombre}</TableCell>
                  <TableCell>{patient.apellido}</TableCell>
                  <TableCell>{patient.fecha_nacimiento ? new Date(patient.fecha_nacimiento).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{patient.genero || 'N/A'}</TableCell>
                  <TableCell>{patient.telefono || 'N/A'}</TableCell>
                  <TableCell>{patient.email || 'N/A'}</TableCell>
                  {user && user.rol === 'admin' && ( // Condicional para admin
                    <>
                      <TableCell>
                        {patient.created_by_nombre && patient.created_by_apellido
                          ? `${patient.created_by_nombre} ${patient.created_by_apellido}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {patient.updated_at
                          ? `${new Date(patient.updated_at).toLocaleDateString()} ${new Date(patient.updated_at).toLocaleTimeString()}`
                          : 'N/A'}
                        {patient.updated_by_nombre && patient.updated_by_apellido
                          ? ` por ${patient.updated_by_nombre} ${patient.updated_by_apellido}`
                          : ''}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEditDialog(patient)}
                    >
                      <EditIcon />
                    </IconButton>
                    {user && user.rol === 'admin' && (
                      <IconButton
                        color="error"
                        onClick={() => handleDeletePatient(patient.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Diálogo para Agregar/Editar Paciente */}
        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>{currentPatient ? 'Editar Paciente' : 'Agregar Paciente'}</DialogTitle>
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
              name="fecha_nacimiento"
              label="Fecha de Nacimiento"
              type="date"
              fullWidth
              variant="standard"
              InputLabelProps={{ shrink: true }}
              value={formState.fecha_nacimiento}
              onChange={handleChange}
            />
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel id="genero-label">Género</InputLabel>
              <Select
                labelId="genero-label"
                id="genero"
                name="genero"
                value={formState.genero}
                onChange={handleChange}
                label="Género"
              >
                <MenuItem value="">Seleccionar</MenuItem>
                <MenuItem value="Masculino">Masculino</MenuItem>
                <MenuItem value="Femenino">Femenino</MenuItem>
                <MenuItem value="Otro">Otro</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              name="telefono"
              label="Teléfono"
              type="text"
              fullWidth
              variant="standard"
              value={formState.telefono}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              name="direccion"
              label="Dirección"
              type="text"
              fullWidth
              variant="standard"
              value={formState.direccion}
              onChange={handleChange}
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
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSavePatient} variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

export default PatientManagement;
