// src/modules/quota/pages/QuotaDetailPage.jsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { ApprenForm } from '@/modules/user/components/ApprenForm';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { QuotaActionPanel } from '@/modules/quota/components/QuotaActionPanel';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const QuotaDetailPage = () => {
  const { id } = useParams(); // ID del USUARIO a consultar
  const { user } = useAuth(); // Guarda/Administrador autenticado en la app
  
  const [cupoData, setCupoData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Determinar el rol operativo actual para el panel de acciones
  const currentRole = user?.roles?.includes('ADMINISTRADOR') 
    ? 'ADMINISTRADOR' 
    : (user?.roles?.includes('CELADOR') ? 'CELADOR' : 'INVITADO');

  // 1. CARGA DE DATOS: Consolidación de información del Usuario, Aprendiz y Vehículo
  useEffect(() => {
    const fetchDetalleCompleto = async () => {
      try {
        // Obtener datos del usuario
        const resUser = await fetch(`http://localhost:3000/usuarios/${id}`);
        if (!resUser.ok) throw new Error("No se pudo obtener el usuario");
        const usuarioDB = await resUser.json();

        // Filtrar vehículo usando 'propietario_id' en la base de datos
        const resVehiculo = await fetch(`http://localhost:3000/vehiculos?propietario_id=${id}`);
        const vehiculosDB = await resVehiculo.json();
        const vehiculoAsociado = vehiculosDB.length > 0 ? vehiculosDB[0] : null;

        // Consultar la bitácora para verificar si el vehículo se encuentra actualmente adentro
        let enParqueadero = false;
        if (vehiculoAsociado) {
          const resBitacora = await fetch(`http://localhost:3000/bitacora_accesos?id_vehiculo=${vehiculoAsociado.id}&_sort=fecha_hora&_order=desc&_limit=1`);
          const ultimoRegistro = await resBitacora.json();
          if (ultimoRegistro.length > 0) {
            enParqueadero = ultimoRegistro[0].tipo_registro === 'ENTRADA';
          }
        }

        // Estructuramos el estado de la página
        setCupoData({
          usuario: usuarioDB,
          aprendiz: usuarioDB.detalle_aprendiz || null,
          vehiculo: vehiculoAsociado,
          estado_cupo: vehiculoAsociado ? vehiculoAsociado.estado_cupo : 'Sin Registrar',
          vehiculoEnParqueadero: enParqueadero
        });

      } catch (error) {
        console.error("Error al cargar el detalle del cupo:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetalleCompleto();
  }, [id]);

  // 2. CONTROLADOR DE OPERACIONES (PERSISTENCIA REAL EN DB.JSON)
  const handleOperacion = async (accion) => {
    if (!cupoData.vehiculo) return alert("Este usuario no posee un vehículo vinculado.");

    try {
      // CASO A: Gestión de Cupo (Afecta el estado maestro del Vehículo)
      if (accion === 'HABILITAR' || accion === 'DESHABILITAR') {
        const nuevoEstado = accion === 'HABILITAR' ? 'Activo' : 'Inactivo';
        
        const response = await fetch(`http://localhost:3000/vehiculos/${cupoData.vehiculo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado_cupo: nuevoEstado })
        });
        
        if (!response.ok) throw new Error("Error al modificar el estado del cupo.");
        
        setCupoData(prev => ({ ...prev, estado_cupo: nuevoEstado }));
        alert(`Cupo modificado a [${nuevoEstado}] con éxito.`);
      }

      // CASO B: Gestión de Tráfico (Afecta la Bitácora Transaccional de Accesos)
      if (accion === 'REGISTRAR_INGRESO' || accion === 'REGISTRAR_SALIDA') {
        const tipoRegistro = accion === 'REGISTRAR_INGRESO' ? 'ENTRADA' : 'SALIDA';
        
        // Formateo manual de fecha/hora compatible con SQL e industria ("YYYY-MM-DD HH:MM:SS")
        const fechaActual = new Date().toISOString().replace('T', ' ').substring(0, 19);

        const payloadBitacora = {
          id_usuario_entra: Number(id),
          id_vehiculo: Number(cupoData.vehiculo.id),
          fecha_hora: fechaActual,
          id_usuario_celador: Number(user.id), 
          tipo_registro: tipoRegistro
        };

        const response = await fetch(`http://localhost:3000/bitacora_accesos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadBitacora)
        });
        
        if (!response.ok) throw new Error("Error al guardar en la bitácora.");
        
        // Sincronizamos el estado visual de la UI
        setCupoData(prev => ({ 
          ...prev, 
          vehiculoEnParqueadero: accion === 'REGISTRAR_INGRESO' 
        }));
        
        alert(`Operación registrada: Vehículo marcó ${tipoRegistro}.`);
      }

    } catch (error) {
      console.error("Error ejecutando la operación:", error);
      alert("Hubo un fallo de conexión con el servidor local de datos.");
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
      
      {/* Encabezado Dinámico */}
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

      {/* Grid de Información de Entidades */}
      <div className="row g-4">
        {/* Panel Izquierdo: Persona e Institución */}
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

        {/* Panel Derecho: Infraestructura, Transporte y Acciones del Funcionario */}
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