import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { crearVehiculo } from '@/modules/vehicle/services/vehicleService';

/** Alta de un vehículo nuevo (tabla base + tabla hija + soportes). */
export const VehicleCreatePage = () => {
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (data) => {
    setGuardando(true);
    setError('');
    try {
      await crearVehiculo(data);
      navigate('/vehiculos', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section>
      <PageHeader title="Registrar vehículo" backTo="/vehiculos" />
      {error && <div className="alert alert-danger">{error}</div>}
      <VehicleForm
        saving={guardando}
        submitLabel="Registrar vehículo"
        onSubmit={guardar}
        onCancel={() => navigate('/vehiculos')}
      />
    </section>
  );
};
