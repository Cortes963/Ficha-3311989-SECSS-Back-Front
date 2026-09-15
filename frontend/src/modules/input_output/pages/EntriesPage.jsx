import { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { DataTable } from '@/components/ui/DataTable';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

export const EntriesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const privateView = user?.roles?.some((role) => ['APRENDIZ', 'INVITADO'].includes(role));
    apiClient.get(privateView ? '/input_output/me' : '/input_output')
      .then((response) => setRows(response.datos || []))
      .catch((e) => setError(e.message));
  }, [user?.roles]);
  return <>
    <DataTable title="Entradas y salidas" columns={[
      { key: 'registro_id', label: 'Registro' },
      { key: 'tipo_vehiculo', label: 'Tipo de vehículo' },
      { key: 'marca', label: 'Marca' },
      { key: 'identificador_vehiculo', label: 'Placa / marco' },
      { key: 'persona_ingresa', label: 'Persona que ingresa' },
      { key: 'documento_persona', label: 'Documento' },
      { key: 'fecha_hora_ingreso', label: 'Fecha ingreso' },
      { key: 'fecha_hora_salida', label: 'Fecha salida', render: (row) => row.fecha_hora_salida || 'Dentro' },
      { key: 'celador_ingreso', label: 'Celador ingreso' },
      { key: 'celador_salida', label: 'Celador salida', render: (row) => row.celador_salida || '—' },
      { key: 'actions', label: 'Acciones', render: (row) => <Link className="btn btn-sm btn-outline-primary" to={`/entradas-salidas/${row.registro_id || row.id}`}>Consultar</Link> }
    ]} rows={rows} />
    {user?.roles?.includes('CELADOR') && <button className="btn btn-primary mt-3" onClick={() => navigate('/entradas-salidas/operar')}>Registrar operación</button>}
    <div className="small text-danger mt-2">{error}</div>
  </>;
};
