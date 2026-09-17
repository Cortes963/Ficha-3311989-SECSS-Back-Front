import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { register } from '@/modules/auth/services/authService';

export const RegisterPage = () => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const submit = async (payload) => {
    try {
      await register(payload);
      window.alert('Registro exitoso en el sistema.');
      navigate('/login');
    } catch (error) { window.alert(error.message || 'No se pudo completar el registro.'); }
  };
  return (
    <div className="container my-5">
      <h1 className="display-5 fw-bold text-center mb-3">Registro de aprendiz SECSS</h1>
      <p className="alert alert-info">El registro público crea únicamente usuarios APRENDIZ.</p>
      {!userData ? (
        <UserAccountForm onSubmit={(data) => setUserData(data)} />
      ) : (
        <ApprenForm onSubmit={(data) => submit({
          ...userData,
          nombre_rol: 'APRENDIZ',
          detalle_aprendiz: data
        })} />
      )}
    </div>
  );
};
