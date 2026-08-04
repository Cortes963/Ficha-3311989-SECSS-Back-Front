// src/modules/auth/pages/RegisterPage.jsx
import { useState } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { useNavigate } from 'react-router-dom';

export const RegisterPage = () => {
  const [esAprendiz, setEsAprendiz] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const registrarUsuarioAPI = async (usuarioFinal) => {
    try {
      // json-server genera el ID automáticamente en POST
      const response = await fetch('http://localhost:3000/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioFinal)
      });

      if (!response.ok) throw new Error("Error en la transacción");
      alert("Registro exitoso en el sistema de base de datos.");
      navigate('/login'); 
    } catch (error) {
      console.error(error);
      alert("No se pudo completar el registro.");
    }
  };

  const handleUserSubmit = (datosUsuario) => {
    if (!esAprendiz) {
      const payload = {
        ...datosUsuario,
        roles: ["INVITADO"],
        estado: 1 
      };
      registrarUsuarioAPI(payload);
    } else {
      setUserData(datosUsuario);
    }
  };

  const handleApprenSubmit = (datosAprendiz) => {
    if (!userData) return alert("Debes completar primero tus datos personales.");

    const payloadFinal = {
      ...userData,
      roles: ["APRENDIZ"],
      estado: 1,
      detalle_aprendiz: {
        ...datosAprendiz,
        ficha: parseInt(datosAprendiz.numeroFicha) 
      }
    };
    registrarUsuarioAPI(payloadFinal);
  };

  return (
    <div className="container my-5 animate__animated animate__fadeIn">
      <div className="text-center mb-5">
        <h1 className="display-5 fw-bold text-dark">Portal de Registro SECSS</h1>
      </div>

      <div className="row justify-content-center">
        <div className="col-xl-8 col-lg-10 col-md-12">
          <div className="card shadow-sm border-0 p-4 mb-4 bg-light">
            <div className="form-check form-switch d-flex align-items-center gap-3">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="checkAprendiz"
                checked={esAprendiz}
                onChange={(e) => {
                  setEsAprendiz(e.target.checked);
                  setUserData(null);
                }}
                style={{ width: '2.5em', height: '1.25em', cursor: 'pointer' }}
              />
              <label className="form-check-label fw-bold text-secondary mb-0" htmlFor="checkAprendiz">
                ¿Soy un Aprendiz SENA?
              </label>
            </div>
          </div>

          {(!esAprendiz || !userData) && (
            <UserAccountForm onSubmit={handleUserSubmit} />
          )}
          
          {(esAprendiz && userData) && (
            <ApprenForm onSubmit={handleApprenSubmit} />
          )}
        </div>
      </div>
    </div>
  );
};