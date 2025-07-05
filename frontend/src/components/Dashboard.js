import React from 'react';
import { Box, Typography, Container, Button } from '@mui/material';
import { useAuth } from '../AuthContext';

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Bienvenido al Dashboard, {user ? user.nombre : 'Usuario'}!
        </Typography>
        <Typography variant="body1" paragraph>
          Tu rol es: {user ? user.rol : 'N/A'}
        </Typography>
        <Typography variant="body1" paragraph>
          Aquí es donde se mostrará el contenido principal de la aplicación.
        </Typography>
        <Button variant="contained" color="secondary" onClick={logout}>
          Cerrar Sesión
        </Button>
      </Box>
    </Container>
  );
}

export default Dashboard;
