const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET || 'supersecretjwtkey';

// Middleware para autenticar el token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ msg: 'No autorizado: Token no proporcionado.' });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ msg: 'No autorizado: Token inválido o expirado.' });
    }
    req.user = user; // Adjuntar la información del usuario (id, rol) a la solicitud
    next();
  });
}

// Middleware para autorizar roles específicos
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ msg: 'Acceso denegado: No tiene los permisos necesarios.' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
