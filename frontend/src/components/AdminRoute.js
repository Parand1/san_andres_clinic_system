import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.rol !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;
