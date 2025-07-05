import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProfessionalManagement from './components/ProfessionalManagement';
import PatientManagement from './components/PatientManagement';
import AttentionManagement from './components/AttentionManagement';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import { AuthProvider, useAuth } from './AuthContext';
import theme from './theme'; // Importamos el tema personalizado
import logo from './assets/san_andres_logo_completo.png'; // Importamos el logo

// Componente para la AppBar con lógica de autenticación
function AppBarContent() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <AppBar position="fixed" elevation={1}>
      <Toolbar>
        <Box component="img" sx={{ height: 40, mr: 2 }} src={logo} alt="Logo Centro Médico San Andrés" />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Centro Médico San Andrés
        </Typography>
        {isAuthenticated ? (
          <>
            {user && user.rol === 'admin' && (
              <Button color="inherit" component={Link} to="/admin/professionals">
                Gestión de Profesionales
              </Button>
            )}
            <Button color="inherit" component={Link} to="/patients">
              Gestión de Pacientes
            </Button>
            <Button color="inherit" component={Link} to="/attentions">
              Gestión de Atenciones
            </Button>
            <Button color="inherit" component={Link} to="/dashboard">
              Dashboard
            </Button>
            <Button color="secondary" variant="contained" onClick={logout}>
              Cerrar Sesión
            </Button>
          </>
        ) : (
          <>
            <Button color="secondary" variant="contained" component={Link} to="/login">
              Login
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Box sx={{ display: 'flex' }}>
            <AppBarContent />
            <Box
              component="main"
              sx={{
                backgroundColor: (theme) => theme.palette.background.default,
                flexGrow: 1,
                height: '100vh',
                overflow: 'auto',
                pt: '64px', // Padding top para compensar la AppBar
              }}
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/attentions"
                  element={
                    <PrivateRoute>
                      <AttentionManagement />
                    </PrivateRoute>
                  }
                />
                
                {/* Ruta protegida */}
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                {/* Ruta protegida para administradores */}
                <Route
                  path="/admin/professionals"
                  element={
                    <AdminRoute>
                      <ProfessionalManagement />
                    </AdminRoute>
                  }
                />
                {/* Ruta protegida para pacientes (admin y profesional) */}
                <Route
                  path="/patients"
                  element={
                    <PrivateRoute>
                      <PatientManagement />
                    </PrivateRoute>
                  }
                />
                {/* Ruta por defecto o de inicio */}
                <Route path="/" element={<Login />} />
              </Routes>
            </Box>
          </Box>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
