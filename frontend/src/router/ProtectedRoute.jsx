// src/router/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';

/**
 * Componente Interceptor:
 * Bloquea el renderizado de componentes hijos si el usuario no cumple los criterios de seguridad.
 */
export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, hasRole, loading } = useAuth();

  // Previene redirecciones prematuras mientras el backend responde
  if (loading) return <div>Cargando sistema de seguridad...</div>;

  // Si no hay sesión activa, expulsar al Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si se exige un rol y el usuario no lo tiene, expulsar
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />; 
  }

  // Si pasa las validaciones, renderiza la ruta solicitada
  return <Outlet />;
};