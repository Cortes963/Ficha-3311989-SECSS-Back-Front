import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { VehicleDetailForm } from '@/modules/vehicle/components/VehicleDetailForm';
import { ETIQUETA_TIPO, identificadorVehiculo, obtenerVehiculo } from '@/modules/vehicle/services/vehicleService';

/** Consulta en solo lectura del vehículo, con acceso directo a la edición. */
export const VehicleDetailPage = () => {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const puedeGestionar = hasRole(['APRENDIZ']);
  const [vehiculo, setVehiculo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    obtenerVehiculo(id)
      .then((datos) => { if (activo) setVehiculo(datos); })
      .catch((err) => { if (activo) setError(err.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [id]);

  if (cargando) return <div className="alert alert-info">Cargando vehículo...</div>;
  if (!vehiculo) return <div className="alert alert-warning">{error || 'No se encontró el vehículo solicitado.'}</div>;

  const acciones = puedeGestionar
    ? <Link className="btn btn-primary" to={`/vehiculos/${id}/editar`}><i className="bi bi-pencil me-1"></i>Editar</Link>
    : null;

  return (
    <section>
      <PageHeader
        title={`${ETIQUETA_TIPO[vehiculo.tipo_vehiculo]} · ${identificadorVehiculo(vehiculo)}`}
        backTo="/vehiculos"
        actions={acciones}
      />
      <VehicleDetailForm key={vehiculo.id} initialData={vehiculo} readOnly />
    </section>
  );
};
