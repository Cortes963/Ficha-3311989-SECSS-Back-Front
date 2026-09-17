import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { actualizarEstadoUsuario, getUsuarios } from '@/modules/user/services/userService';
import { DataTable } from '@/components/ui/DataTable';
import { useAuth } from '@/modules/auth/context/AuthContext';

const fullName = (row) => [row.primer_nombre, row.segundo_nombre, row.primer_apellido, row.segundo_apellido].filter(Boolean).join(' ');

const roleBadgeClass = (role) => {
  switch (role) {
    case 'APRENDIZ': return 'bg-success-subtle text-success-emphasis';
    case 'INVITADO': return 'bg-primary-subtle text-primary-emphasis';
    case 'CELADOR': return 'bg-warning-subtle text-warning-emphasis';
    default: return 'bg-info-subtle text-info-emphasis';
  }
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const DirectoryPage = ({ title, role, allowDetail = true, canDisable = false, disableRoles = [], createPath = '', createRoles = [], detailPath = '/usuarios' }) => {
  const { hasRole } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { getUsuarios(role).then(setRows).catch((e) => setError(e.message)); }, [role]);
  const changeState = async (row) => { try { await actualizarEstadoUsuario(row.id, row.estado ? 0 : 1); setRows((items) => items.map((item) => item.id === row.id ? { ...item, estado: row.estado ? 0 : 1 } : item)); } catch (e) { setError(e.message); } };
  const columns = [
    { key: 'numero_documento', label: 'Documento' },
    { key: 'nombre', label: 'Nombre', render: (row) => <div className="d-flex align-items-center gap-2"><i className="bi bi-person-circle text-secondary fs-4"></i><span>{fullName(row)}</span></div> },
    { key: 'roles', label: 'Rol(es)', render: (row) => (row.roles || []).length
      ? <div className="d-flex flex-wrap gap-1">{row.roles.map((r) => <span key={r} className={`badge rounded-pill fw-semibold ${roleBadgeClass(r)}`}>{r}</span>)}</div>
      : <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">Sin rol activo</span> },
  ];
  if (role === 'APRENDIZ') columns.push({ key: 'ficha', label: 'Ficha' }, { key: 'fecha_vinculacion', label: 'Vinculación', render: (row) => formatDate(row.fecha_vinculacion) }, { key: 'fecha_terminacion', label: 'Terminación', render: (row) => formatDate(row.fecha_terminacion) });
  columns.push({ key: 'estado', label: 'Estado', render: (row) => <span className="d-flex align-items-center gap-2"><i className={`bi bi-circle-fill ${row.estado ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.5rem' }}></i>{row.estado ? 'Activo' : 'Inactivo'}</span> });
  if (allowDetail || canDisable) columns.push({ key: 'actions', label: 'Acciones', render: (row) => <div className="d-flex gap-2">{allowDetail && <Link className="btn btn-sm btn-primary rounded-2" to={`${detailPath}/${row.id}`}>Consultar</Link>}{canDisable && hasRole(disableRoles) && <button className={`btn btn-sm ${row.estado ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => changeState(row)}>{row.estado ? 'Deshabilitar' : 'Habilitar'}</button>}</div> });
  const actions = createPath && hasRole(createRoles) ? <Link className="btn btn-primary" to={createPath}>Registrar</Link> : null;
  return <><DataTable title={title} columns={columns} rows={rows} actions={actions} /><div className="small text-danger mt-2">{error}</div></>;
};