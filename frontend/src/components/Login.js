import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  CssBaseline,
  InputAdornment,
  IconButton,
  Fade
} from '@mui/material';
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import logo from '../assets/san_andres_logo_solo.png';

const BACKGROUND_IMAGE = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.user);
      } else {
        setError(data.msg || 'Credenciales incorrectas.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <CssBaseline />
      
      {/* IZQUIERDA: IMAGEN Y DEGRADADO (Oculto en móviles) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' }, // Ocultar en pantallas pequeñas
          width: '60%', // Ocupa el 60% del ancho
          position: 'relative',
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          textAlign: 'center',
          p: 4
        }}
      >
        {/* Capa de Degradado */}
        <Box
            sx={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(135deg, rgba(0, 167, 157, 0.85) 0%, rgba(103, 58, 183, 0.75) 100%)', // El degradado que te gustó
                zIndex: 1
            }}
        />
        
        {/* Contenido sobre el degradado */}
        <Box sx={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
            <Typography variant="h2" component="h1" fontWeight="800" sx={{ mb: 2, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                Centro Médico San Andrés
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 300, letterSpacing: 1 }}>
                Tecnología avanzada y calidez humana para tu bienestar.
            </Typography>
        </Box>
      </Box>

      {/* DERECHA: FORMULARIO */}
      <Box
        component={Paper}
        elevation={0}
        square
        sx={{
            width: { xs: '100%', md: '40%' }, // 40% en desktop, 100% en móvil
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 6,
            backgroundColor: '#ffffff'
        }}
      >
        <Fade in={true} timeout={1000}>
            <Box sx={{ width: '100%', maxWidth: 400 }}>
                
                <Box sx={{ textAlign: 'center', mb: 5 }}>
                    <img src={logo} alt="Logo" style={{ height: 70, marginBottom: 20 }} />
                    <Typography component="h2" variant="h4" fontWeight="bold" color="text.primary">
                        Bienvenido
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Inicia sesión en tu cuenta
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
                )}

                <Box component="form" noValidate onSubmit={handleSubmit}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Correo Electrónico"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        sx={{ 
                            mb: 2,
                            '& .MuiOutlinedInput-root': { borderRadius: 2 } 
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Contraseña"
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{ 
                            mb: 4,
                            '& .MuiOutlinedInput-root': { borderRadius: 2 } 
                        }}
                        InputProps={{
                            endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                            ),
                        }}
                    />
                    
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{
                            py: 1.8,
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            borderRadius: 3,
                            textTransform: 'none',
                            boxShadow: '0 4px 14px 0 rgba(0, 167, 157, 0.39)',
                            background: 'linear-gradient(45deg, #00A79D 30%, #26C6DA 90%)', // Botón con gradiente sutil
                            '&:hover': {
                                boxShadow: '0 6px 20px 0 rgba(0, 167, 157, 0.5)',
                                transform: 'scale(1.01)'
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </Button>
                </Box>
                
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        ¿Necesitas ayuda? <span style={{ color: '#00A79D', fontWeight: 'bold', cursor: 'pointer' }}>Contacta a soporte</span>
                    </Typography>
                </Box>
            </Box>
        </Fade>
      </Box>
    </Box>
  );
}

export default Login;