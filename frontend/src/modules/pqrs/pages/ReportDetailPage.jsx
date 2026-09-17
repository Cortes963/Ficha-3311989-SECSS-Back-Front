import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { actualizarReporte, obtenerReporte } from '@/modules/pqrs/services/reporteService';
import { FormField } from '@/components/ui/FormField';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const ReportDetailPage = () => {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const canEdit = hasRole(['CELADOR']);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [currentTime] = useState(() => Date.now());
  useEffect(() => { obtenerReporte(id).then(setData).catch((e) => setMessage(e.message)); }, [id]);
  if (!data) return <div className="alert alert-info">{message || 'Cargando reporte...'}</div>;
  const editable = canEdit && data.fecha_hora && currentTime - new Date(data.fecha_hora).getTime() <= 5 * 60 * 1000;
  return <form className="card p-4" onSubmit={async (event) => { event.preventDefault(); if (!editable) return; try { const result = await actualizarReporte(id, data); setMessage(result.mensaje); } catch (e) { setMessage(e.message); } }}><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">{canEdit ? 'Consultar y editar reporte propio' : 'Consultar reporte'}</h2><Link to="/reportes" className="btn btn-outline-secondary">Volver</Link></div><dl className="row"><dt className="col-sm-4">Responsable</dt><dd className="col-sm-8">{data.celador || '—'}</dd><dt className="col-sm-4">Fecha y hora</dt><dd className="col-sm-8">{data.fecha_hora || '—'}</dd><dt className="col-sm-4">Estado</dt><dd className="col-sm-8">{data.estado === 1 ? 'Revisado' : 'No revisado'}</dd><dt className="col-sm-4">Entrada/salida</dt><dd className="col-sm-8">{data.id_entrada_salida ? <Link to={`/entradas-salidas/${data.id_entrada_salida}`}>Ver movimiento #{data.id_entrada_salida}</Link> : 'Sin relación'}</dd></dl><FormField label="Asunto" name="asunto" value={data.asunto} onChange={(e) => setData({ ...data, asunto: e.target.value })} readOnly={!editable} required /><FormField label="Descripcion" name="cuerpo" value={data.cuerpo} onChange={(e) => setData({ ...data, cuerpo: e.target.value })} readOnly={!editable} required />{canEdit && !editable && <p className="text-muted small">La edicion de este reporte esta disponible solo durante los primeros 5 minutos.</p>}{editable && <button className="btn btn-primary">Guardar cambios</button>}{message && <div className="alert alert-info mt-3">{message}</div>}</form>;
};
