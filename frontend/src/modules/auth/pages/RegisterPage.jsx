// src/modules/auth/pages/RegisterPage.jsx
import { useState } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { useNavigate } from 'react-router-dom';
import { register } from '@/modules/auth/services/authService';

export const RegisterPage = () => {
  const [esAprendiz, setEsAprendiz] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const registrarUsuarioAPI = async (payload) => {
    try {
      // Antes: crearUsuario() -> POST /user, ruta inexistente y que además
      // exige token. El registro público real es
      // POST /api/auth/storeAuthRegister (sin token).
      await register(payload);
      alert("Registro exitoso en el sistema.");
      navigate('/login');
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo completar el registro.");
    }
  };

  const handleUserSubmit = (datosUsuario) => {
    // datosUsuario ya viene con los campos separados (primer_nombre,
    // segundo_nombre, primer_apellido, segundo_apellido, ...) directamente
    // desde UserAccountForm — antes se armaba un "nombre_completo" y acá se
    // volvía a partir por espacios, lo cual se rompía en cuanto faltaba el
    // segundo nombre o el segundo apellido.
    const usuarioBase = { ...datosUsuario };

    if (!esAprendiz) {
      registrarUsuarioAPI({ ...usuarioBase, nombre_rol: 'INVITADO' });
    } else {
      setUserData(usuarioBase);
    }
  };

  const handleApprenSubmit = (datosAprendiz) => {
    if (!userData) return alert("Debes completar primero tus datos personales.");

    registrarUsuarioAPI({
      ...userData,
      nombre_rol: 'APRENDIZ',
      detalle_aprendiz: {
        id_centro: datosAprendiz.id_centro,
        ficha: datosAprendiz.ficha,
        direccion: datosAprendiz.direccion,
        fecha_vinculacion: datosAprendiz.fechaVinculacion || null,
        fecha_terminacion: datosAprendiz.fechaTerminacion || null,
        imagen_url_identificacion: 'PENDIENTE',
        imagen_url_carnet_sena: 'PENDIENTE',
        imagen_url_aprendiz: 'PENDIENTE'
      }
    });
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
