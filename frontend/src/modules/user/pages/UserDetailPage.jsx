// src/modules/user/pages/UserDetailPage.jsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { QuotaActionPanel } from '@/modules/quota/components/QuotaActionPanel';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const UserDetailPage = () => {
  const { id } = useParams(); // Este ID es el del USUARIO
  const { user } = useAuth(); // Quien está logueado (Admin/Celador)
  
  const [cupoData, setCupoData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. OBTENER LOS DATOS REALES DEL SERVIDOR
  useEffect(() => {
    const fetchDetalleCompleto = async () => {
      try {
        // Pedimos el usuario (incluye datos de aprendiz)
        const resUser = await fetch(`http://localhost:3000/usuarios/${id}`);
        const usuarioDB = await resUser.json();

        // Pedimos el vehículo asociado a este usuario
        const resVehiculo = await fetch(`http://localhost:3000/vehiculos?usuarioId=${id}`);
        const vehiculoDB = await resVehiculo.json();
        const vehiculoUnico = vehiculoDB.length > 0 ? vehiculoDB[0] : null;

        // Armamos el objeto complejo para la vista
        setCupoData({
          usuario: usuarioDB,
          aprendiz: usuarioDB.detalle_aprendiz || null,
          vehiculo: vehiculoUnico,
          estado_cupo: vehiculoUnico?.estado_cupo || 'Sin Cupo',
          vehiculoEnParqueadero: vehiculoUnico?.vehiculoEnParqueadero || false
        });

      } catch (error) {
        console.error("Error al cargar el detalle del cupo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetalleCompleto();
  }, [id]);

  // 2. EJECUTAR ACCIONES REALES HACIA LA BASE DE DATOS
  const handleOperacion = async (accion) => {
    if (!cupoData.vehiculo) return alert("Este usuario no tiene un vehículo registrado.");

    let actualizaciones = {};

    // Mapeamos la acción del panel al cambio en BD
    if(accion === 'REGISTRAR_INGRESO') actualizaciones = { vehiculoEnParqueadero: true };
    if(accion === 'REGISTRAR_SALIDA') actualizaciones = { vehiculoEnParqueadero: false };
    if(accion === 'DESHABILITAR') actualizaciones = { estado_cupo: 'Inactivo' };
    if(accion === 'HABILITAR') actualizaciones = { estado_cupo: 'Activo' };

    try {
      // Usamos PATCH para actualizar solo los campos específicos del vehículo en db.json
      const response = await fetch(`http://localhost:3000/vehiculos/${cupoData.vehiculo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actualizaciones)
      });

      if (!response.ok) throw new Error("Fallo la actualización en el servidor.");

      // Actualizamos el estado de React para que la interfaz reaccione al instante
      setCupoData(prev => ({
        ...prev,
        ...actualizaciones,
        vehiculo: { ...prev.vehiculo, ...actualizaciones }
      }));

    } catch (error) {
      console.error("Error en la operación:", error);
      alert("Hubo un problema al procesar la solicitud.");
    }
  };

  if (loading) return <div className="container mt-5 text-center">Consultando expedientes...</div>;
  if (!cupoData) return <div className="container mt-5">Registro no encontrado.</div>;

  // Obtenemos el rol principal del usuario logueado para pasar al ActionPanel
  const currentRole = user?.roles?.[0] || 'INVITADO'; 

  return (
    <div className="container my-5 animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <h2 className="fw-bold text-dark m-0">
          <i className="bi bi-file-earmark-person me-2"></i>Gestión de Expediente #{cupoData.usuario.numero_documento}
        </h2>
        <Link to="/cupos" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-2"></i>Volver a la lista
        </Link>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <h4 className="text-secss mb-3"><i className="bi bi-person-badge"></i> Perfil de Usuario</h4>
          <UserAccountForm initialData={cupoData.usuario} readOnly={true} />
          
          {cupoData.aprendiz && (
            <>
              <h4 className="text-success mb-3 mt-4"><i className="bi bi-mortarboard"></i> Información Académica</h4>
              <ApprenForm initialData={cupoData.aprendiz} readOnly={true} />
            </>
          )}
        </div>

        <div className="col-xl-6">
          <h4 className="text-primary mb-3"><i className="bi bi-car-front"></i> Vehículo Vinculado</h4>
          {cupoData.vehiculo ? (
            <>
              <VehicleForm initialData={cupoData.vehiculo} readOnly={true} />
              <QuotaActionPanel 
                rolUsuario={currentRole} 
                estadoCupo={cupoData.estado_cupo}
                vehiculoDentro={cupoData.vehiculoEnParqueadero}
                onAction={handleOperacion} 
              />
            </>
          ) : (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i> Este usuario aún no ha matriculado ningún vehículo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};