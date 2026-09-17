import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';// Import adicional
import { listarCupos, obtenerMiCupo, actualizarEstadoCupo } from '@/modules/quota/services/Quotaservices';
import { DataTable } from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';

export const AccessQuotaPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMINISTRADOR');
  const isPrivileged = user?.roles?.some((role) => ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR'].includes(role));
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = async () => {
      try {
        if (isPrivileged) setRows(await listarCupos());
        else {
          const own = await obtenerMiCupo();
          setRows(own.vehiculo ? [own.vehiculo] : []);
        }
      } catch (e) { setError(e.message); }
    };
    load();
  }, [isPrivileged, user?.roles]);

  const changeState = async (row) => {
  try {
    const estado = (row.estado ?? row.estado_cupo) ? 0 : 1;
    await actualizarEstadoCupo(row.id_usuario, row.id_vehiculo, estado);
    setRows((items) => items.map((item) =>
      item.id_usuario === row.id_usuario && item.id_vehiculo === row.id_vehiculo
        ? { ...item, estado, estado_autorizacion: estado ? 'ACTIVO' : 'INACTIVO' }
        : item
    ));
  } catch (e) { setError(e.message); }
};

  const status = (value) => ({ 0: 'INACTIVO', 1: 'ACTIVO' }[value] || value || 'INACTIVO');
  return <>
    <DataTable title={isPrivileged ? 'Autorizaciones de vehículos' : 'Mi cupo vehicular'} columns={[
      { key: 'usuario', label: 'Usuario', render: (row) => row.usuario || 'Mi autorización' },
      { key: 'numero_documento', label: 'Documento' },
      { key: 'tipo_vehiculo', label: 'Tipo de vehículo' },
      { key: 'marca', label: 'Marca' },
      { key: 'identificador_vehiculo', label: 'Placa / marco' },
      { key: 'estado', label: 'Estado', render: (row) => row.estado_autorizacion || status(row.estado ?? row.estado_cupo) },
      { key: 'administrador_auditor', label: 'Administrador auditor', render: (row) => row.administrador_auditor || '—' },
      { key: 'actions', label: 'Acciones', render: (row) => {
  return <div className="d-flex gap-2">
    {row.id_usuario && row.id_vehiculo
      ? <Link className="btn btn-sm btn-outline-primary" to={`/cupos/${row.id_usuario}/${row.id_vehiculo}`}>Consultar más a detalle</Link>
      : <span className="text-danger small">Identificador incompleto</span>}
    {isAdmin && row.id_usuario && row.id_vehiculo &&
      <button className={`btn btn-sm ${Number(row.estado ?? row.estado_cupo) === 0 ? 'btn-outline-success' : 'btn-outline-danger'}`} onClick={() => changeState(row)}>{Number(row.estado ?? row.estado_cupo) === 0 ? 'Habilitar' : 'Deshabilitar'}</button>}
  </div>;
} }
   ]} rows={rows} />
    <div className="small text-danger mt-2">{error}</div>
  </>;
};
