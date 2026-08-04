// src/modules/auth/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

// 1. Instanciamos el contexto de seguridad
const AuthContext = createContext(null);

// 2. Proveedor de estado global
export const AuthProvider = ({ children }) => {
  const [usuarios, setUsuarios] = useState([]); 
  const [user, setUser] = useState(null);       // Información del usuario en sesión
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);  

  // Sincronización inicial con el backend simulado
  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const respuesta = await fetch('http://localhost:3000/usuarios');
        if (!respuesta.ok) throw new Error('Fallo en la comunicación con el servidor.');
        
        const datos = await respuesta.json();
        setUsuarios(datos);
      } catch (err) {
        console.error("Error de infraestructura:", err.message);
        setError("Servicio de autenticación no disponible.");
      } finally {
        setLoading(false);
      }
    };
    cargarUsuarios();
  }, []);

  /**
   * Procesa las credenciales contra la base de datos en memoria.
   * Tolerante a diferentes nomenclaturas en el esquema JSON.
   */
/**
   * Procesa las credenciales utilizando el Número de Documento de identidad.
   * Modificado para acoplarse a las reglas de negocio de SECSS.
   */
  const login = (documento, password) => {
    setError(null);
    
    if (usuarios.length === 0) {
      setError("Sistema inicializando, intente nuevamente.");
      return false;
    }

    // Búsqueda del usuario por su número de documento de identidad
    const cuentaEncontrada = usuarios.find(u => u.numero_documento === documento);

    if (!cuentaEncontrada) {
      setError("Número de documento o contraseña incorrectos.");
      setIsAuthenticated(false);
      return false; 
    }

    // Validación de la contraseña (soporta texto plano o hash del db.json)
    const contraseniaValida = 
      cuentaEncontrada.password_hash === password || 
      cuentaEncontrada.password === password ||
      cuentaEncontrada.contrasena === password;

    if (contraseniaValida) {
      setUser(cuentaEncontrada);
      setIsAuthenticated(true);
      return true;
    } else {
      setError("Número de documento o contraseña incorrectos.");
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