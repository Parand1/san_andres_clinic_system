import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function SecretaryRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Permite el acceso si el rol es 'secretaria' o 'admin'
  if (user && (user.rol !== 'secretaria' && user.rol !== 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default SecretaryRoute;
