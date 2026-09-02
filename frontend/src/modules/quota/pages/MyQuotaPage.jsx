// src/modules/quota/pages/MyQuotaPage.jsx
import { useState, useEffect } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getUsuarioPorId } from '@/modules/user/services/userService';
import { obtenerCupoPorUsuario } from '@/modules/quota/services/Quotaservices';

export const MyQuotaPage = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [apprenData, setApprenData] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchMiInformacion = async () => {
      try {
        const [usuarioDB, cupoInfo] = await Promise.all([
          getUsuarioPorId(user.id),
          obtenerCupoPorUsuario(user.id)
        ]);
        setUserData(usuarioDB);
        setApprenData(usuarioDB.detalle_aprendiz || null);
        setVehicleData(cupoInfo.vehiculo);
      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMiInformacion();
  }, [user]);

  if (loading) return <div className="container mt-5 text-center">Cargando perfil...</div>;

  return (
    <div className="container my-5">
      <div className="mb-4 border-bottom pb-3">
        <h2 className="fw-bold text-dark m-0">Mi Perfil y Cupo SECSS</h2>
      </div>

      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Por ahora esta vista es de solo lectura — la edición de perfil y vehículo se habilita en una próxima fase.
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <h4 className="text-secss mb-3">Mis Datos Personales</h4>
          <UserAccountForm initialData={userData} readOnly={true} />

          {apprenData && (
            <>
              <h4 className="text-success mb-3 mt-4">Mi Información Académica</h4>
              <ApprenForm initialData={apprenData} readOnly={true} />
            </>
          )}
        </div>

        <div className="col-xl-6">
          <h4 className="text-primary mb-3">Mi Medio de Transporte</h4>
          {vehicleData ? (
            <VehicleForm initialData={vehicleData} readOnly={true} />
          ) : (
            <div className="alert alert-warning">Aún no tienes un vehículo matriculado.</div>
          )}
        </div>
      </div>
    </div>
  );
};
