import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { obtenerPqrs, responderPqrs } from '@/modules/pqrs/services/pqrsService';
import { ResponseForm } from '@/modules/pqrs/components/ResponseForm';

export const PqrsDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [pqrs, setPqrs] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { obtenerPqrs(id).then(setPqrs).catch((e) => setError(e.message)); }, [id]);
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!pqrs) return <div className="alert alert-info">Cargando PQRS...</div>;
  const isAdmin = user?.roles?.includes('ADMINISTRADOR');
  const respond = async (payload) => {
    try { await responderPqrs(id, payload); setMessage('Respuesta registrada.'); setPqrs({ ...pqrs, estado: 3, tieneRespuesta: true }); } catch (e) { setMessage(e.message); }
  };
  return <div className="card border-0 shadow-sm p-4">
    <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Detalle de PQRS</h2><Link to="/pqrs" className="btn btn-outline-secondary">Volver</Link></div>
    <dl className="row">{[['Solicitante', pqrs.usuario ? `${pqrs.usuario.primerNombre} ${pqrs.usuario.primerApellido}` : pqrs.idUsuario], ['Asunto', pqrs.asunto], ['Descripción', pqrs.cuerpo], ['Fecha', pqrs.fechaHora], ['Estado', pqrs.estado], ['Anexos', pqrs.anexos?.join(', ') || '—']].map(([label, value]) => <div className="row" key={label}><dt className="col-sm-3">{label}</dt><dd className="col-sm-9">{value || '—'}</dd></div>)}</dl>
    {pqrs.respuesta && <div className="border-start border-4 border-success ps-3 mb-3"><h3 className="h5">Respuesta registrada</h3><ResponseForm initialData={{ asunto: pqrs.respuesta.asunto, cuerpo: pqrs.respuesta.cuerpo }} readOnly /><p className="mb-1"><strong>Fecha:</strong> {pqrs.respuesta.fechaHora || '—'}</p><p className="mb-0"><strong>Respondiente:</strong> {pqrs.respuesta.respondiente || pqrs.respuesta.idUsuarioAdministrador || '—'} · <strong>Estado:</strong> {pqrs.estado}</p></div>}
    {isAdmin && !pqrs.tieneRespuesta && <><h3 className="h5 mt-3">Responder PQRS</h3><ResponseForm initialData={{ asunto: `Re: ${pqrs.asunto}` }} onSubmit={respond} /></>}
    {message && <div className="alert alert-info mt-3 mb-0">{message}</div>}
  </div>;
};
