import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';// Import adicional
import { listarCupos, obtenerMiCupo, actualizarEstadoCupo } from '@/modules/quota/services/Quotaservices';
import { DataTable } from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';

export const AccessQuotaPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMINISTRADOR');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = async () => {
      try {
        if (user?.roles?.some((role) => ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR'].includes(role))) setRows(await listarCupos());
        else {
          const own = await obtenerMiCupo();
          setRows(own.vehiculo ? [own.vehiculo] : []);
        }
      } catch (e) { setError(e.message); }
    };
    load();
  }, [isAdmin, user?.roles]);

  const disable = async (row) => {
  try {
    await actualizarEstadoCupo(row.id_usuario, row.id_vehiculo, 0);
    setRows((items) => items.map((item) =>
      item.id_usuario === row.id_usuario && item.id_vehiculo === row.id_vehiculo
        ? { ...item, estado: 0, estado_autorizacion: 'SUSPENDIDO' }
        : item
    ));
  } catch (e) { setError(e.message); }
};

  const status = (value) => ({ 0: 'PENDIENTE', 1: 'APROBADO', 2: 'SUSPENDIDO' }[value] || value || 'PENDIENTE');
  return <>
    <DataTable title={isAdmin ? 'Autorizaciones de vehículos' : 'Mi cupo vehicular'} columns={[
      { key: 'usuario', label: 'Usuario', render: (row) => row.usuario || 'Mi autorización' },
      { key: 'numero_documento', label: 'Documento' },
      { key: 'tipo_vehiculo', label: 'Tipo de vehículo' },
      { key: 'marca', label: 'Marca' },
      { key: 'identificador_vehiculo', label: 'Placa / marco' },
      { key: 'estado', label: 'Estado', render: (row) => row.estado_autorizacion || status(row.estado ?? row.estado_cupo) },
      { key: 'administrador_auditor', label: 'Administrador auditor', render: (row) => row.administrador_auditor || '—' },
      { key: 'actions', label: 'Acciones', render: (row) => {
  const estadoActual = row.estado_autorizacion || status(row.estado ?? row.estado_cupo);
  return <div className="d-flex gap-2">
    {row.id_usuario && row.id_vehiculo
      ? <Link className="btn btn-sm btn-outline-primary" to={`/cupos/${row.id_usuario}/${row.id_vehiculo}`}>Consultar más a detalle</Link>
      : <span className="text-danger small">Identificador incompleto</span>}
    {isAdmin && estadoActual !== 'SUSPENDIDO' && row.id_usuario && row.id_vehiculo &&
      <button className="btn btn-sm btn-outline-danger" onClick={() => disable(row)}>Deshabilitar</button>}
  </div>;
} }
   ]} rows={rows} />
    <div className="small text-danger mt-2">{error}</div>
  </>;
};
