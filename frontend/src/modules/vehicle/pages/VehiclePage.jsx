import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { Link } from 'react-router-dom';
import { appendFiles } from '@/utils/media';

export const VehiclePage = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const load = () => apiClient.get('/vehicle/me').then((response) => setVehicles(response.datos || [])).catch((error) => setMessage(error.message));
  useEffect(() => { load(); }, []);
  const save = async (data) => {
    try {
      const form = new FormData();
      form.append('tipo_vehiculo', data.tipo_vehiculo);
      form.append('marca', data.marca);
      form.append('color', data.color);
      Object.entries(data.detalles || {}).forEach(([key, value]) => form.append(key, value ?? ''));
      appendFiles(form, data.imagenes);
      const response = selected ? await apiClient.patch(`/vehicle/${selected.id}`, form) : await apiClient.post('/vehicle', form);
      setMessage(response.mensaje);
      setSelected(null);
      await load();
    } catch (error) { setMessage(error.message); }
  };
  const canCreate = user?.roles?.includes('APRENDIZ');
  return <section><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4">Mis vehículos</h2><div className="d-flex gap-2"><Link className="btn btn-outline-secondary" to="/">Volver</Link>{canCreate && <button className="btn btn-primary" onClick={() => setSelected({})}>Registrar vehículo</button>}</div></div>{selected && <VehicleForm initialData={selected.id ? selected : null} readOnly={false} onSubmit={save} />}{vehicles.map((vehicle) => <div className="card p-3 mb-3" key={vehicle.id}><div className="d-flex justify-content-between"><span>{vehicle.tipo_vehiculo} · {vehicle.marca} · {vehicle.color}</span>{canCreate && <button className="btn btn-sm btn-outline-primary" onClick={() => setSelected(vehicle)}>Editar</button>}</div></div>)}{message && <div className="alert alert-info">{message}</div>}</section>;
};
