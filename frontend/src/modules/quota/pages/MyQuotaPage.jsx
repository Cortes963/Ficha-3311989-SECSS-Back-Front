// src/modules/quota/pages/MyQuotaPage.jsx
import { useState, useEffect } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { useAuth } from '@/modules/auth/context/AuthContext';

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
        const resUser = await fetch(`http://localhost:3000/usuarios/${user.id}`);
        const dataUser = await resUser.json();
        setUserData(dataUser);
        if (dataUser.detalle_aprendiz) setApprenData(dataUser.detalle_aprendiz);

        const resVehiculo = await fetch(`http://localhost:3000/vehiculos?propietario_id=${user.id}`);
        const dataVehiculos = await resVehiculo.json();
        if (dataVehiculos.length > 0) setVehicleData(dataVehiculos[0]);
      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMiInformacion();
  }, [user]);

  // Guarda los cambios del Usuario y Aprendiz combinados
  const handleUpdateUsuarioCompleto = async (formDataUsuario, formDataAprendiz) => {
    try {
      // Unimos los datos antiguos con los nuevos para no perder roles, contraseñas, etc.
      const payloadUsuario = {
        ...userData,
        ...formDataUsuario,
        ...(apprenData || formDataAprendiz ? {
          detalle_aprendiz: {
            ...userData.detalle_aprendiz,
            ...formDataAprendiz
          }
        } : {})
      };

      const response = await fetch(`http://localhost:3000/usuarios/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadUsuario)
      });

      if (!response.ok) throw new Error("Error en servidor");
      const dataActualizada = await response.json();
      setUserData(dataActualizada);
      if (dataActualizada.detalle_aprendiz) setApprenData(dataActualizada.detalle_aprendiz);
      alert("Perfil actualizado correctamente en la base de datos.");
    } catch (error) {
      alert("No se pudo salvar la información personal.");
    }
  };

  // Guarda la inserción o edición del vehículo
  const handleUpdateVehicle = async (vehiculoPayload) => {
    // Añadimos las llaves foráneas y reglas de negocio
    const payloadCompleto = {
      ...vehiculoPayload,
      propietario_id: Number(user.id),
      estado_cupo: 'Inactivo', // Regla: toda edición inactiva el cupo
      imagenes: vehicleData?.imagenes || {} // Preservar imágenes si existen
    };

    try {
      const endpoint = vehicleData 
        ? `http://localhost:3000/vehiculos/${vehicleData.id}` 
        : 'http://localhost:3000/vehiculos'; 
      const method = vehicleData ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadCompleto)
      });

      if (!response.ok) throw new Error("Fallo al guardar");
      const savedData = await response.json();
      setVehicleData(savedData);
      alert("Vehículo guardado. El cupo está INACTIVO pendiente de revisión.");
    } catch (error) {
      alert("Ocurrió un error al guardar los datos del transporte.");
    }
  };

  if (loading) return <div className="container mt-5 text-center">Cargando perfil...</div>;

  return (
    <div className="container my-5">
      <div className="mb-4 border-bottom pb-3">
        <h2 className="fw-bold text-dark m-0">Mi Perfil y Cupo SECSS</h2>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <h4 className="text-secss mb-3">Mis Datos Personales</h4>
          <UserAccountForm initialData={userData} readOnly={false} onSubmit={(data) => handleUpdateUsuarioCompleto(data, apprenData)} /> 
          
          {apprenData && (
            <>
              <h4 className="text-success mb-3 mt-4">Mi Información Académica</h4>
              <ApprenForm initialData={apprenData} readOnly={false} onSubmit={(data) => handleUpdateUsuarioCompleto(userData, data)} />
            </>
          )}
        </div>

        <div className="col-xl-6">
          <h4 className="text-primary mb-3">Mi Medio de Transporte</h4>
          <VehicleForm initialData={vehicleData} readOnly={false} onSubmit={handleUpdateVehicle} />
        </div>
      </div>
    </div>
  );
};