import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { actualizarEstadoUsuario, getUsuarios } from '@/modules/user/services/userService';
import { DataTable } from '@/components/ui/DataTable';
import { useAuth } from '@/modules/auth/context/AuthContext';

const fullName = (row) => [row.primer_nombre, row.segundo_nombre, row.primer_apellido, row.segundo_apellido].filter(Boolean).join(' ');

export const DirectoryPage = ({ title, role, allowDetail = true, canDisable = false, disableRoles = [], createPath = '', createRoles = [], detailPath = '/usuarios' }) => {
  const { hasRole } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { getUsuarios(role).then(setRows).catch((e) => setError(e.message)); }, [role]);
  const disable = async (row) => { try { await actualizarEstadoUsuario(row.id, 0); setRows((items) => items.map((item) => item.id === row.id ? { ...item, estado: 0 } : item)); } catch (e) { setError(e.message); } };
  const columns = [{ key: 'numero_documento', label: 'Documento' }, { key: 'nombre', label: 'Nombre', render: fullName }, { key: 'roles', label: 'Rol(es)', render: (row) => (row.roles || []).join(', ') || 'Sin rol activo' }];
  if (role === 'APRENDIZ') columns.push({ key: 'ficha', label: 'Ficha' }, { key: 'fecha_vinculacion', label: 'Vinculación' }, { key: 'fecha_terminacion', label: 'Terminación' });
  columns.push({ key: 'estado', label: 'Estado', render: (row) => row.estado ? 'Activo' : 'Inactivo' });
  if (allowDetail || canDisable) columns.push({ key: 'actions', label: 'Acciones', render: (row) => <div className="d-flex gap-2">{allowDetail && <Link className="btn btn-sm btn-outline-primary" to={`${detailPath}/${row.id}`}>Consultar</Link>}{canDisable && hasRole(disableRoles) && row.estado === 1 && <button className="btn btn-sm btn-outline-danger" onClick={() => disable(row)}>Deshabilitar</button>}</div> });
  const actions = createPath && hasRole(createRoles) ? <Link className="btn btn-primary" to={createPath}>Registrar</Link> : null;
  return <><DataTable title={title} columns={columns} rows={rows} actions={actions} /><div className="small text-danger mt-2">{error}</div></>;
};
