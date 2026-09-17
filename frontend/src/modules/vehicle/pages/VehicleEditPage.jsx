import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { actualizarVehiculo, obtenerVehiculo } from '@/modules/vehicle/services/vehicleService';

/** Edición de un vehículo existente; reutiliza el mismo formulario del registro. */
export const VehicleEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehiculo, setVehiculo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    obtenerVehiculo(id)
      .then((datos) => { if (activo) setVehiculo(datos); })
      .catch((err) => { if (activo) setError(err.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [id]);

  const guardar = async (data) => {
    setGuardando(true);
    setError('');
    try {
      await actualizarVehiculo(id, data);
      navigate(`/vehiculos/${id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="alert alert-info">Cargando vehículo...</div>;
  if (!vehiculo) return <div className="alert alert-warning">{error || 'No se encontró el vehículo solicitado.'}</div>;

  return (
    <section>
      <PageHeader title="Editar vehículo" backTo={`/vehiculos/${id}`} />
      {error && <div className="alert alert-danger">{error}</div>}
      <VehicleForm
        key={vehiculo.id}
        initialData={vehiculo}
        saving={guardando}
        submitLabel="Guardar cambios"
        onSubmit={guardar}
        onCancel={() => navigate(`/vehiculos/${id}`)}
      />
    </section>
  );
};
