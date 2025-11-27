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
import AppointmentCalendar from './components/AppointmentCalendar'; // <-- NUEVO
import CashBoxView from './components/CashBoxView'; // <-- NUEVO
import ReportsView from './components/ReportsView'; // <-- NUEVO
import TarifarioManagement from './components/TarifarioManagement'; // <-- NUEVO
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import SecretaryRoute from './components/SecretaryRoute'; // <-- NUEVO
import { AuthProvider, useAuth } from './AuthContext';
import theme from './theme'; // Importamos el tema personalizado
import appBarLogo from './assets/san_andres_logo_solo.png'; // Importamos el nuevo logo para la AppBar

// Componente para la AppBar con lógica de autenticación
function AppBarContent() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <AppBar position="fixed" elevation={1}>
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: isAuthenticated ? 'flex-start' : 'center', alignItems: 'center' }}>
            <Box component="img" sx={{ height: 40, mr: 2 }} src={appBarLogo} alt="Logo Centro Médico San Andrés" />
            <Typography variant="h6" noWrap component="div">
              Centro Médico San Andrés
            </Typography>
        </Box>
        {isAuthenticated ? (
          <>
            {user && (user.rol === 'admin' || user.rol === 'secretaria') && (
              <>
                <Button color="inherit" component={Link} to="/appointments">
                  Agendamiento
                </Button>
                <Button color="inherit" component={Link} to="/cashbox">
                  Gestión de Caja
                </Button>
                <Button color="inherit" component={Link} to="/tarifario">
                  Tarifario
                </Button>
              </>
            )}
            {user && user.rol === 'admin' && (
              <>
                <Button color="inherit" component={Link} to="/admin/professionals">
                  Gestión de Profesionales
                </Button>
              </>
            )}
            <Button color="inherit" component={Link} to="/patients">
              Gestión de Pacientes
            </Button>
            {(user && (user.rol === 'admin' || user.rol === 'profesional')) && (
              <Button color="inherit" component={Link} to="/attentions">
                Gestión de Atenciones
              </Button>
            )}
            <Button color="inherit" component={Link} to="/dashboard">
              Dashboard
            </Button>
            <Button color="secondary" variant="contained" onClick={logout}>
              Cerrar Sesión
            </Button>
          </>
        ) : (
          <>
            {/* El botón de Login se ha eliminado de aquí */}
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
                <Route
                  path="/appointments"
                  element={
                    <SecretaryRoute>
                      <AppointmentCalendar />
                    </SecretaryRoute>
                  }
                />
                <Route
                  path="/cashbox"
                  element={
                    <SecretaryRoute>
                      <CashBoxView />
                    </SecretaryRoute>
                  }
                />
                <Route
                  path="/tarifario"
                  element={
                    <SecretaryRoute>
                      <TarifarioManagement />
                    </SecretaryRoute>
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
                <Route
                  path="/reports"
                  element={
                    <AdminRoute>
                      <ReportsView />
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
