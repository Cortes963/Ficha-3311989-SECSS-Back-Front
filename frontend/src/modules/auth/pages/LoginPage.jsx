// src/modules/auth/pages/LoginPage.jsx
import { useState } from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '@/components/styles/style.css'; 

export const LoginPage = () => {
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({ documento: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(credentials.documento, credentials.password);
    if (success) {
      navigate('/'); 
    }
  };

  return (
    // bg-light da el fondo gris tenue. vh-100 ocupa toda la pantalla.
    <div className="bg-light d-flex justify-content-center align-items-center vh-100 px-3">
      
      {/* Contenedor principal con tope de ancho */}
      <div className="w-100 border-sena rounded-4" style={{ maxWidth: '450px' }}>

        {/* Tarjeta de Login usando utilidades de Bootstrap */}
        <div className="card  border-0 shadow-lg rounded-4 p-4 p-md-5">
          <h3 className="text-center text-sena fw-bold mb-2">Bienvenidos a  SECSS</h3>
          <p className="text-center text-secondary mb-4">Por favor, inicia sesión para continuar.</p>

          <form onSubmit={handleSubmit}>
            
            {/* Input: Documento */}
            <div className="mb-4 position-relative">
              <label htmlFor="documento" className="form-label fw-bold text-dark mb-1">
                Número de Documento
              </label>
              <i className="fa-regular fa-id-card position-absolute text-secondary" style={{ bottom: '15px', left: '15px', fontSize: '1.2rem' }}></i>
              <input 
                type="text" 
                id="documento"
                name="documento"
                className="form-control form-control-lg ps-5 bg-light border-0 shadow-sm" 
                placeholder="Ej: 1028342536"
                pattern="[0-9]+"
                value={credentials.documento}
                onChange={handleChange}
                required 
              />
            </div>

            {/* Input: Contraseña */}
            <div className="mb-4 position-relative">
              <label htmlFor="password" className="form-label fw-bold text-dark mb-1">
                Contraseña
              </label>
              <i className="fa-solid fa-lock position-absolute text-secondary" style={{ bottom: '15px', left: '15px', fontSize: '1.2rem' }}></i>
              <input 
                type={showPassword ? "text" : "password"} 
                id="password"
                name="password"
                className="form-control form-control-lg ps-5 pe-5 bg-light border-0 shadow-sm" 
                placeholder="********"
                value={credentials.password}
                onChange={handleChange}
                required 
              />
              <span 
                className="position-absolute text-sena-light fw-bold" 
                style={{ bottom: '15px', right: '15px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </span>
            </div>

            {/* Recuperar contraseña */}
            <div className="mb-4 text-start">
              <Link to="/recuperar" className="link-sena small">¿Has olvidado tu contraseña?</Link>
            </div>

            {/* Botón Submit */}
            <button type="submit" className="btn btn-sena btn-lg w-100 shadow-sm rounded-3">
              Iniciar Sesión
            </button>

            {/* Alerta de Error Nativa de Bootstrap */}
            {error && (
              <div className="alert alert-danger mt-3 mb-0 text-center fw-bold py-2" role="alert">
                {error}
              </div>
            )}

            {/* Enlace de Registro */}
            <div className="mt-4 pt-3 border-top text-center text-secondary small">
              ¿No tienes cuenta? <Link to="/registro" className="link-sena ms-1">Regístrate</Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};