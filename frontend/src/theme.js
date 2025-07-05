import { createTheme } from '@mui/material/styles';

// Definición de la paleta de colores con turquesa y morado
const theme = createTheme({
  palette: {
    primary: {
      main: '#00A79D', // Un tono de turquesa profesional
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#673AB7', // Un tono de morado vibrante (Deep Purple 500)
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4f6f8', // Un gris muy claro para el fondo general
      paper: '#ffffff',
    },
    text: {
      primary: '#172b4d',
      secondary: '#5e6c84',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
    MuiAppBar: {
        styleOverrides: {
            colorPrimary: {
                backgroundColor: '#ffffff', // AppBar blanca para un look más limpio
                color: '#172b4d', // Texto oscuro en la AppBar
            }
        }
    }
  },
});

export default theme;
