import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

// Iconos para navegación
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PeopleIcon from '@mui/icons-material/People';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import LogoutIcon from '@mui/icons-material/Logout';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProfessionalManagement from './components/ProfessionalManagement';
import PatientManagement from './components/PatientManagement';
import AttentionManagement from './components/AttentionManagement';
import AppointmentCalendar from './components/AppointmentCalendar';
import CashBoxView from './components/CashBoxView';
import ReportsView from './components/ReportsView';
import TarifarioManagement from './components/TarifarioManagement';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import SecretaryRoute from './components/SecretaryRoute';
import { AuthProvider, useAuth } from './AuthContext';
import theme from './theme';
import appBarLogo from './assets/san_andres_logo_solo.png';

// Componente de Botón de Navegación Personalizado
const NavButton = ({ to, label, icon: Icon }) => {
    const location = useLocation();
    // Verificamos si la ruta actual empieza con el 'to' del botón (para subrutas) o es exacta
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

    return (
        <Button
            component={Link}
            to={to}
            startIcon={Icon ? <Icon /> : null}
            sx={{
                mx: 0.5,
                px: 2,
                py: 1,
                color: isActive ? '#00A79D' : '#555', // Turquesa si activo, gris si no
                fontWeight: isActive ? 700 : 500,
                textTransform: 'none',
                fontSize: '0.95rem',
                borderRadius: 2,
                backgroundColor: isActive ? 'rgba(0, 167, 157, 0.08)' : 'transparent', // Fondo sutil si activo
                transition: 'all 0.2s',
                '&:hover': {
                    backgroundColor: 'rgba(0, 167, 157, 0.05)',
                    color: '#00A79D',
                    transform: 'translateY(-1px)' // Pequeña elevación al hover
                },
                // Indicador inferior animado
                position: 'relative',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                    transform: isActive ? 'translateX(-50%) scaleX(1)' : 'translateX(-50%) scaleX(0)',
                    width: '60%',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#00A79D',
                    transition: 'transform 0.3s ease',
                    opacity: isActive ? 1 : 0
                }
            }}
        >
            {label}
        </Button>
    );
};

// Componente AppBar (Solo contenido, la lógica de visualización la maneja el Layout)
function NavigationBar() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <AppBar 
        position="fixed" 
        elevation={0} 
        sx={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', // Un poco más opaco para legibilidad
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            color: '#333',
            zIndex: (theme) => theme.zIndex.drawer + 1
        }}
    >
      <Toolbar sx={{ height: 70 }}>
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: isAuthenticated ? 'flex-start' : 'center', alignItems: 'center' }}>
            <Box component="img" sx={{ height: 45, mr: 2 }} src={appBarLogo} alt="Logo Centro Médico San Andrés" />
            <Typography 
                variant="h6" 
                noWrap 
                component={Link}
                to="/dashboard"
                sx={{ 
                    fontWeight: 700, 
                    color: '#00A79D', 
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    fontSize: '1.2rem',
                    textDecoration: 'none',
                    display: { xs: 'none', md: 'block' } // Ocultar nombre en móviles si falta espacio
                }}
            >
              Centro Médico San Andrés
            </Typography>
        </Box>
        {isAuthenticated && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* DASHBOARD (Siempre visible) */}
            <NavButton to="/dashboard" label="Inicio" icon={DashboardIcon} />

            {user && (user.rol === 'admin' || user.rol === 'secretaria') && (
              <>
                <NavButton to="/appointments" label="Agenda" icon={CalendarMonthIcon} />
                <NavButton to="/cashbox" label="Caja" icon={PointOfSaleIcon} />
                <NavButton to="/tarifario" label="Tarifas" icon={LocalOfferIcon} />
              </>
            )}
            
            {user && user.rol === 'admin' && (
              <NavButton to="/admin/professionals" label="Personal" icon={SupervisorAccountIcon} />
            )}
            
            <NavButton to="/patients" label="Pacientes" icon={PeopleIcon} />
            
            {(user && (user.rol === 'admin' || user.rol === 'profesional')) && (
              <NavButton to="/attentions" label="Atención" icon={MedicalServicesIcon} />
            )}
            
            <Box sx={{ borderLeft: '1px solid #ddd', height: 30, mx: 1 }} /> {/* Separador vertical */}

            <Button 
                color="error" 
                variant="outlined" 
                onClick={logout}
                startIcon={<LogoutIcon />}
                sx={{ 
                    ml: 1, 
                    borderRadius: 3, 
                    px: 2, 
                    textTransform: 'none',
                    borderWidth: '1.5px',
                    fontWeight: 600,
                    '&:hover': { borderWidth: '1.5px', backgroundColor: '#ffebee' }
                }}
            >
              Salir
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

// Componente Layout: Maneja la estructura principal y el padding
function Layout({ children }) {
  const location = useLocation();
  // Ocultar barra en Login y raíz
  const hideAppBar = location.pathname === '/login' || location.pathname === '/';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!hideAppBar && <NavigationBar />}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Si hay barra, añadimos padding superior para evitar superposición
          pt: hideAppBar ? 0 : '70px', 
          backgroundColor: (theme) => theme.palette.background.default,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto' // Asegurar scroll si es necesario
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Layout>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/attentions" element={<PrivateRoute><AttentionManagement /></PrivateRoute>} />
                <Route path="/appointments" element={<SecretaryRoute><AppointmentCalendar /></SecretaryRoute>} />
                <Route path="/cashbox" element={<SecretaryRoute><CashBoxView /></SecretaryRoute>} />
                <Route path="/tarifario" element={<SecretaryRoute><TarifarioManagement /></SecretaryRoute>} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/admin/professionals" element={<AdminRoute><ProfessionalManagement /></AdminRoute>} />
                <Route path="/reports" element={<AdminRoute><ReportsView /></AdminRoute>} />
                <Route path="/patients" element={<PrivateRoute><PatientManagement /></PrivateRoute>} />
                <Route path="/" element={<Login />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;