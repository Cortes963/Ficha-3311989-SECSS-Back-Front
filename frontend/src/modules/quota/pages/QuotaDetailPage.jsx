// src/modules/quota/pages/QuotaDetailPage.jsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { QuotaActionPanel } from '@/modules/quota/components/QuotaActionPanel';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getUsuarioPorId } from '@/modules/user/services/userService';
import { obtenerCupoPorUsuario, actualizarEstadoCupo } from '@/modules/quota/services/Quotaservices';
import { registrarEntrada, registrarSalida } from '@/modules/input_output/pages/services/input_outputservice';

export const QuotaDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [cupoData, setCupoData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentRole = user?.roles?.includes('ADMINISTRADOR')
    ? 'ADMINISTRADOR'
    : (user?.roles?.find(r => r === 'CELADOR' || r === 'JEFE_SEGURIDAD') || 'INVITADO');

  const fetchDetalleCompleto = useCallback(async () => {
    try {
      const [usuarioDB, cupoInfo] = await Promise.all([
        getUsuarioPorId(id),          // ya desempacado
        obtenerCupoPorUsuario(id)     // ya desempacado
      ]);
      const { vehiculo, vehiculoEnParqueadero, idEntradaAbierta } = cupoInfo;

      setCupoData({
        usuario: usuarioDB,
        aprendiz: usuarioDB.detalle_aprendiz || null,
        vehiculo,
        estado_cupo: vehiculo ? (vehiculo.estado_cupo === 1 ? 'Activo' : 'Inactivo') : 'Sin Registrar',
        vehiculoEnParqueadero,
        idEntradaAbierta
      });
    } catch (error) {
      console.error("Error al cargar el detalle del cupo:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetalleCompleto(); }, [fetchDetalleCompleto]);

  const handleOperacion = async (accion) => {
    if (!cupoData.vehiculo) return alert("Este usuario no posee un vehículo vinculado.");

    try {
      if (accion === 'HABILITAR' || accion === 'DESHABILITAR') {
        const nuevoEstadoNumero = accion === 'HABILITAR' ? 1 : 0;
        await actualizarEstadoCupo(id, cupoData.vehiculo.id_vehiculo, nuevoEstadoNumero);
        setCupoData(prev => ({ ...prev, estado_cupo: accion === 'HABILITAR' ? 'Activo' : 'Inactivo' }));
        alert(`Cupo modificado a [${accion === 'HABILITAR' ? 'Activo' : 'Inactivo'}] con éxito.`);
      }

      if (accion === 'REGISTRAR_INGRESO') {
        await registrarEntrada({
          id_usuario_entra: Number(id),
          id_vehiculo: cupoData.vehiculo.id_vehiculo,
          id_usuario_celador_ingreso: Number(user.id)
        });
        alert('Ingreso registrado con éxito.');
        fetchDetalleCompleto();
      }

      if (accion === 'REGISTRAR_SALIDA') {
        if (!cupoData.idEntradaAbierta) return alert("No hay un ingreso abierto para este vehículo.");
        await registrarSalida(cupoData.idEntradaAbierta, { id_usuario_celador_salida: Number(user.id) });
        setCupoData(prev => ({ ...prev, vehiculoEnParqueadero: false, idEntradaAbierta: null }));
        alert('Salida registrada con éxito.');
      }
    } catch (error) {
      console.error("Error ejecutando la operación:", error);
      alert(error.message || "Hubo un fallo al procesar la operación.");
    }
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted fw-bold">Consultando registros del sistema...</p>
      </div>
    );
  }

  if (!cupoData || !cupoData.usuario) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-danger">El usuario o cupo solicitado no existe en el sistema.</div>
        <Link to="/cupos" className="btn btn-secondary">Regresar a la lista</Link>
      </div>
    );
  }

  return (
    <div className="container my-5 animate__animated animate__fadeIn">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 border-bottom pb-3 gap-3">
        <div>
          <h2 className="fw-bold text-dark m-0">Gestión de Control de Acceso</h2>
          <p className="text-muted m-0">
            Estado de autorización:
            <span className={`ms-2 badge ${cupoData.estado_cupo === 'Activo' ? 'bg-success' : 'bg-danger'}`}>
              {cupoData.estado_cupo}
            </span>
            <span className={`ms-2 badge ${cupoData.vehiculoEnParqueadero ? 'bg-info text-dark' : 'bg-secondary'}`}>
              {cupoData.vehiculoEnParqueadero ? 'DENTRO DE INSTALACIONES' : 'FUERA'}
            </span>
          </p>
        </div>
        <Link to="/cupos" className="btn btn-outline-secondary shadow-sm">
          <i className="bi bi-arrow-left me-2"></i>Volver a la lista
        </Link>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <h4 className="text-secss mb-3"><i className="bi bi-person-badge me-2"></i>Perfil de Usuario</h4>
          <UserAccountForm initialData={cupoData.usuario} readOnly={true} />

          {cupoData.aprendiz && (
            <>
              <h4 className="text-success mb-3 mt-4"><i className="bi bi-mortarboard me-2"></i>Información Académica</h4>
              <ApprenForm initialData={cupoData.aprendiz} readOnly={true} />
            </>
          )}
        </div>

        <div className="col-xl-6">
          <h4 className="text-primary mb-3"><i className="bi bi-car-front me-2"></i>Vehículo Vinculado</h4>
          {cupoData.vehiculo ? (
            <>
              <VehicleForm initialData={cupoData.vehiculo} readOnly={true} />
              <div className="mt-4 card shadow-sm border-0 animate__animated animate__slideInUp">
                <div className="card-body p-4 bg-light rounded">
                  <h5 className="fw-bold mb-3 border-bottom pb-2 text-dark">Consola de Decisiones Operativas</h5>
                  <QuotaActionPanel
                    rolUsuario={currentRole}
                    estadoCupo={cupoData.estado_cupo}
                    vehiculoDentro={cupoData.vehiculoEnParqueadero}
                    onAction={handleOperacion}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="alert alert-warning border-start border-4 border-warning shadow-sm animate__animated animate__pulse">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
              Este usuario no ha completado la matrícula de su medio de transporte. Las acciones de control de acceso se encuentran bloqueadas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
