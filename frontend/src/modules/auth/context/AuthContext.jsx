// src/modules/auth/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react';
import { login as loginRequest } from '@/modules/auth/services/authService';

// 1. Instanciamos el contexto de seguridad
const AuthContext = createContext(null);

// 2. Proveedor de estado global
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Información del usuario en sesión
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  // Ya no hay una carga inicial de "todos los usuarios" que esperar (esa fue
  // la causa raíz del problema de seguridad original: exponía las contraseñas
  // de todo el sistema al navegador antes de que nadie iniciara sesión). El
  // login ahora es una sola llamada bajo demanda, por eso no hay estado de
  // carga inicial que bloquee el render.
  const loading = false;

  /**
   * Procesa las credenciales contra el backend real (POST /api/auth/login).
   *
   * Nota de alcance: esta llamada funciona hoy contra el endpoint tal como
   * está — que todavía compara la contraseña en texto plano del lado del
   * servidor. Eso queda pendiente de una fase aparte (bcrypt + JWT), según
   * lo acordado. Este cambio solo conecta el flujo, no lo asegura.
   */
  const login = async (documento, password) => {
    setError(null);

    try {
      const respuesta = await loginRequest(documento, password);
      setUser(respuesta.usuario);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(err.message || 'Número de documento o contraseña incorrectos.');
      setIsAuthenticated(false);
      return false;
    }
  };

  /**
   * Destruye la sesión actual
   */
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  /**
   * Motor RBAC (Role-Based Access Control)
   * Verifica si el usuario actual posee alguno de los roles requeridos.
   */
  const hasRole = (allowedRoles) => {
    if (!user || !user.roles || !Array.isArray(user.roles)) return false;
    // Evalúa si hay intersección entre los roles del usuario y los permitidos
    return allowedRoles.some(rol => user.roles.includes(rol));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, error, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Hook de consumo estrictamente tipado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth fue invocado fuera del árbol de AuthProvider');
  }
  return context;
};
