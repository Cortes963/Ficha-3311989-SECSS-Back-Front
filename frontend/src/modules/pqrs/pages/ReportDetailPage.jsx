import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { actualizarReporte, obtenerReporte } from '@/modules/pqrs/services/reporteService';
import { FormField } from '@/components/ui/FormField';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const ReportDetailPage = () => {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const canEdit = hasRole(['CELADOR']);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => { obtenerReporte(id).then(setData).catch((e) => setMessage(e.message)); }, [id]);
  if (!data) return <div className="alert alert-info">{message || 'Cargando reporte...'}</div>;
  return <form className="card p-4" onSubmit={async (event) => { event.preventDefault(); if (!canEdit) return; try { const result = await actualizarReporte(id, data); setMessage(result.mensaje); } catch (e) { setMessage(e.message); } }}><h2 className="h4">{canEdit ? 'Consultar y editar reporte propio' : 'Consultar reporte'}</h2><FormField label="Asunto" name="asunto" value={data.asunto} onChange={(e) => setData({ ...data, asunto: e.target.value })} readOnly={!canEdit} required /><FormField label="Descripción" name="cuerpo" value={data.cuerpo} onChange={(e) => setData({ ...data, cuerpo: e.target.value })} readOnly={!canEdit} required /><FormField label="Estado" name="estado" type="number" min="0" max="1" value={data.estado} onChange={(e) => setData({ ...data, estado: Number(e.target.value) })} readOnly={!canEdit} required />{canEdit && <button className="btn btn-primary">Guardar cambios</button>}{message && <div className="alert alert-info mt-3">{message}</div>}</form>;
};
