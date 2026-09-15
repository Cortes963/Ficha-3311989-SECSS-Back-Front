/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { login as loginRequest } from '@/modules/auth/services/authService';
import { getToken, setToken } from '@/services/apiClient';

// 1. Instanciamos el contexto de seguridad
const AuthContext = createContext(null);

// Clave para persistir los datos del usuario (el token vive aparte, en
// apiClient, porque es lo único que el resto de módulos necesita leer).
const USER_STORAGE_KEY = 'secss_usuario';

const normalizeRole = (role) => String(role || '')
  .trim()
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    const user = raw ? JSON.parse(raw) : null;
    return user ? { ...user, roles: (user.roles || []).map(normalizeRole) } : null;
  } catch {
    return null; // JSON corrupto en localStorage no debe tumbar la app
  }
};

// 2. Proveedor de estado global
export const AuthProvider = ({ children }) => {
  // Se restaura de forma síncrona desde localStorage para que un F5 no
  // expulse al usuario a /login mientras "carga" — si hay token guardado,
  // asumimos la sesión vigente hasta que el backend diga lo contrario.
  const [user, setUser] = useState(readStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getToken()) && Boolean(readStoredUser()));
  const [error, setError] = useState(null);

  // Ya no hay una carga inicial de "todos los usuarios" que esperar (esa fue
  // la causa raíz del problema de seguridad original: exponía las contraseñas
  // de todo el sistema al navegador antes de que nadie iniciara sesión). El
  // login ahora es una sola llamada bajo demanda, por eso no hay estado de
  // carga inicial que bloquee el render.
  const loading = false;

  /**
   * Procesa las credenciales contra el backend real (POST /api/auth/storeAuthLogin).
   * El backend ya compara con bcrypt y devuelve un JWT (ver
   * Backend/controller/auth.controller.js); ese token se guarda vía
   * apiClient.setToken para que las siguientes peticiones a rutas protegidas
   * (todo lo que no sea /auth o /core) manden el header Authorization.
   */
  const login = async (documento, password) => {
    setError(null);

    try {
      const respuesta = await loginRequest(documento, password);
      // El token va a apiClient (lo necesita todo el resto de módulos para
      // el header Authorization); el usuario se persiste acá para sobrevivir
      // un refresh de página sin tener que volver a pedir credenciales.
      setToken(respuesta.token);
      const usuario = { ...respuesta.usuario, roles: (respuesta.usuario.roles || []).map(normalizeRole) };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));
      setUser(usuario);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(err.message || 'Número de documento o contraseña incorrectos.');
      setToken(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      setIsAuthenticated(false);
      return false;
    }
  };

  /**
   * Destruye la sesión actual
   */
  const logout = () => {
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
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
    const currentRoles = user.roles.map(normalizeRole);
    return allowedRoles.some((rol) => currentRoles.includes(normalizeRole(rol)));
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
