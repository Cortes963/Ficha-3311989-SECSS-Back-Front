// src/modules/auth/pages/RegisterPage.jsx
import { useState } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { useNavigate } from 'react-router-dom';
import { crearUsuario } from '@/modules/user/services/userService';

export const RegisterPage = () => {
  const [esAprendiz, setEsAprendiz] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const registrarUsuarioAPI = async (payload) => {
    try {
      await crearUsuario(payload);
      alert("Registro exitoso en el sistema.");
      navigate('/login');
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo completar el registro.");
    }
  };

  const handleUserSubmit = (datosUsuario) => {
    const [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido] =
      datosUsuario.nombre_completo.split(' ');

    const usuarioBase = {
      tipo_documento: datosUsuario.tipo_documento,
      numero_documento: datosUsuario.numero_documento,
      primer_nombre,
      segundo_nombre: segundo_nombre || null,
      primer_apellido: primer_apellido || '',
      segundo_apellido: segundo_apellido || null,
      n_celular: datosUsuario.n_celular,
      correo: datosUsuario.correo,
      password_hash: datosUsuario.password,
    };

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
        nombre_centro: datosAprendiz.nombre_centro,
        ficha: datosAprendiz.ficha,
        direccion: datosAprendiz.direccion,
        fecha_vinculacion: datosAprendiz.fechaVinculacion || null,
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
