import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Paper,
  CssBaseline,
} from '@mui/material';
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';
import logo from '../assets/san_andres_logo_completo.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.user);
      } else {
        setError(data.msg || 'Error al iniciar sesión.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }} wrap="nowrap">
      <CssBaseline />
      {/* Panel Izquierdo: Formulario de Login */}
      <Grid item xs={12} sm={5} md={4} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Typography component="h1" variant="h5" color="primary" fontWeight="bold">
            Bienvenido
          </Typography>
          <Typography component="p" variant="subtitle1" color="text.secondary">
            Inicia sesión para continuar
          </Typography>
          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
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
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              Ingresar
            </Button>
          </Box>
        </Box>
      </Grid>
      {/* Panel Derecho: Logo */}
      <Grid
        item
        xs={false}
        sm={7}
        md={8}
        sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: (t) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          p: 4,
        }}
      >
        <Box
            component="img"
            sx={{
                maxWidth: '50%', // Tamaño del logo reducido
                height: 'auto',
                objectFit: 'contain',
            }}
            src={logo}
            alt="Logo Centro Médico San Andrés"
        />
      </Grid>
    </Grid>
  );
}

export default Login;