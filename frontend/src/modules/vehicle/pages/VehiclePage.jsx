import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { DataTable } from '@/components/ui/DataTable';
import {
  ETIQUETA_TIPO,
  eliminarVehiculo,
  identificadorVehiculo,
  listarMisVehiculos
} from '@/modules/vehicle/services/vehicleService';

/**
 * Listado "Mis vehículos": punto de entrada del módulo.
 * Desde acá se navega a registrar (/vehiculos/nuevo), consultar
 * (/vehiculos/:id) y editar (/vehiculos/:id/editar).
 */
export const VehiclePage = () => {
  const { hasRole } = useAuth();
  const puedeGestionar = hasRole(['APRENDIZ']);

  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  // Nota: no se llama setState de forma síncrona acá para que el efecto de
  // carga inicial no dispare renders en cascada (regla react-hooks).
  const cargar = useCallback(() => listarMisVehiculos()
    .then(setVehiculos)
    .catch((error) => setMensaje({ tipo: 'danger', texto: error.message }))
    .finally(() => setCargando(false)), []);

  useEffect(() => { cargar(); }, [cargar]);

  const borrar = async (vehiculo) => {
    const rotulo = `${ETIQUETA_TIPO[vehiculo.tipo_vehiculo]} ${identificadorVehiculo(vehiculo)}`;
    if (!window.confirm(`¿Eliminar el vehículo ${rotulo}? Esta acción no se puede deshacer.`)) return;
    try {
      const respuesta = await eliminarVehiculo(vehiculo.id);
      setMensaje({ tipo: 'success', texto: respuesta?.mensaje || 'Vehículo eliminado correctamente.' });
      await cargar();
    } catch (error) {
      setMensaje({ tipo: 'danger', texto: error.message });
    }
  };

  const columnas = [
    {
      key: 'tipo_vehiculo',
      label: 'Tipo',
      render: (fila) => (
        <span className="badge text-bg-light border">
          <i className={`bi ${fila.tipo_vehiculo === 'MOTO' ? 'bi-scooter' : 'bi-bicycle'} me-1`}></i>
          {ETIQUETA_TIPO[fila.tipo_vehiculo]}
        </span>
      )
    },
    { key: 'identificador', label: 'Placa / N.° marco', render: (fila) => identificadorVehiculo(fila) },
    { key: 'marca', label: 'Marca', render: (fila) => fila.marca || '—' },
    { key: 'color', label: 'Color', render: (fila) => fila.color || '—' },
    {
      key: 'detalle',
      label: 'Detalle',
      render: (fila) => fila.tipo_vehiculo === 'MOTO'
        ? `${fila.detalles.cilindraje || '—'} c.c. · Modelo ${fila.detalles.modelo || '—'}`
        : fila.detalles.clase_bicicleta || '—'
    },
    {
      key: 'estado_cupo',
      label: 'Cupo',
      render: (fila) => (
        <span className={`badge ${String(fila.estado_cupo).toLowerCase() === 'activo' ? 'text-bg-success' : 'text-bg-secondary'}`}>
          {fila.estado_cupo || 'Sin asignar'}
        </span>
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (fila) => (
        <div className="d-flex gap-2">
          <Link className="btn btn-sm btn-outline-secondary" to={`/vehiculos/${fila.id}`}>
            <i className="bi bi-eye me-1"></i>Consultar
          </Link>
          {puedeGestionar && (
            <>
              <Link className="btn btn-sm btn-outline-primary" to={`/vehiculos/${fila.id}/editar`}>
                <i className="bi bi-pencil me-1"></i>Editar
              </Link>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => borrar(fila)}>
                <i className="bi bi-trash me-1"></i>Eliminar
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const acciones = puedeGestionar
    ? <Link className="btn btn-primary" to="/vehiculos/nuevo"><i className="bi bi-plus-lg me-1"></i>Registrar vehículo</Link>
    : null;

  return (
    <section>
      {mensaje && (
        <div className={`alert alert-${mensaje.tipo} alert-dismissible`} role="alert">
          {mensaje.texto}
          <button type="button" className="btn-close" onClick={() => setMensaje(null)} aria-label="Cerrar"></button>
        </div>
      )}
      <DataTable
        title="Mis vehículos"
        columns={columnas}
        rows={vehiculos}
        loading={cargando}
        actions={acciones}
        empty="Aún no tiene vehículos matriculados. Use «Registrar vehículo» para crear el primero."
      />
    </section>
  );
};
