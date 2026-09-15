import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarReportes } from '@/modules/pqrs/services/reporteService';
import { DataTable } from '@/components/ui/DataTable';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const ReportsPage = () => {
  const { hasRole } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { listarReportes().then((response) => setRows(response.datos)).catch((e) => setError(e.message)); }, []);
  const actions = hasRole(['CELADOR']) ? <RouterLink className="btn btn-primary" to="/reportes/nuevo">Registrar reporte</RouterLink> : null;
  return <><DataTable title="Reportes" actions={actions} columns={[{ key: 'asunto', label: 'Asunto' }, { key: 'celador', label: 'Responsable' }, { key: 'fecha_hora', label: 'Fecha' }, { key: 'estado', label: 'Estado' }, { key: 'actions', label: 'Acciones', render: (row) => <Link className="btn btn-sm btn-outline-primary" to={`/reportes/${row.id}`}>Consultar</Link> }]} rows={rows} /><div className="small text-danger mt-2">{error}</div></>;
};
