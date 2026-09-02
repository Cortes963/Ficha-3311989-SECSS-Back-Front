// src/modules/user/pages/UserDetailPage.jsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { getUsuarioPorId } from '@/modules/user/services/userService';
import { obtenerCupoPorUsuario } from '@/modules/quota/services/Quotaservices';

// Vista de solo lectura (pensada para celadores, que normalmente no tienen
// vehículo/cupo). A diferencia de QuotaDetailPage, no hay consola de acciones.
export const UserDetailPage = () => {
  const { id } = useParams();
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const [usuarioDB, cupoInfo] = await Promise.all([
          getUsuarioPorId(id),
          obtenerCupoPorUsuario(id)
        ]);
        setDatos({
          usuario: usuarioDB,
          aprendiz: usuarioDB.detalle_aprendiz || null,
          vehiculo: cupoInfo.vehiculo
        });
      } catch (error) {
        console.error("Error al cargar el perfil:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetalle();
  }, [id]);

  if (loading) return <div className="container mt-5 text-center">Consultando expedientes...</div>;
  if (!datos) return <div className="container mt-5">Registro no encontrado.</div>;

  return (
    <div className="container my-5 animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <h2 className="fw-bold text-dark m-0">
          <i className="bi bi-file-earmark-person me-2"></i>Perfil #{datos.usuario.numero_documento}
        </h2>
        <Link to="/celadores" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-2"></i>Volver a la lista
        </Link>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <h4 className="text-secss mb-3"><i className="bi bi-person-badge"></i> Perfil de Usuario</h4>
          <UserAccountForm initialData={datos.usuario} readOnly={true} />

          {datos.aprendiz && (
            <>
              <h4 className="text-success mb-3 mt-4"><i className="bi bi-mortarboard"></i> Información Académica</h4>
              <ApprenForm initialData={datos.aprendiz} readOnly={true} />
            </>
          )}
        </div>

        {datos.vehiculo && (
          <div className="col-xl-6">
            <h4 className="text-primary mb-3"><i className="bi bi-car-front"></i> Vehículo Vinculado</h4>
            <VehicleForm initialData={datos.vehiculo} readOnly={true} />
          </div>
        )}
      </div>
    </div>
  );
};
