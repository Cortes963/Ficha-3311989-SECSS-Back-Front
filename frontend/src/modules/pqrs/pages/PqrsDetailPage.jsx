import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { actualizarPqrs, actualizarRespuesta, obtenerPqrs, responderPqrs } from '@/modules/pqrs/services/pqrsService';
import { ResponseForm } from '@/modules/pqrs/components/ResponseForm';
import { FormField } from '@/components/ui/FormField';

export const PqrsDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [pqrs, setPqrs] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [currentTime] = useState(() => Date.now());
  useEffect(() => { obtenerPqrs(id).then(setPqrs).catch((e) => setError(e.message)); }, [id]);
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!pqrs) return <div className="alert alert-info">Cargando PQRS...</div>;

  const isAdmin = user?.roles?.includes('ADMINISTRADOR');
  const isOwner = user?.id === pqrs.idUsuario;
  const canEditOwn = isOwner && !pqrs.tieneRespuesta && Number(pqrs.estado) === 1 && currentTime - new Date(pqrs.fechaHora).getTime() <= 5 * 60 * 1000;
  const canEditResponse = isAdmin && pqrs.respuesta && currentTime - new Date(pqrs.respuesta.fechaHora).getTime() <= 5 * 60 * 1000;
  const respond = async (payload) => {
    try { await responderPqrs(id, payload); setMessage('Respuesta registrada.'); setPqrs(await obtenerPqrs(id)); } catch (e) { setMessage(e.message); }
  };
  const savePqrs = async (event) => {
    event.preventDefault();
    try { await actualizarPqrs(id, { asunto: pqrs.asunto, cuerpo: pqrs.cuerpo }); setEditing(false); setMessage('PQRS actualizada.'); } catch (e) { setMessage(e.message); }
  };
  const editAnswer = async (payload) => {
    try { await actualizarRespuesta(pqrs.respuesta.id, payload); setPqrs({ ...pqrs, respuesta: { ...pqrs.respuesta, ...payload } }); setMessage('Respuesta actualizada.'); } catch (e) { setMessage(e.message); }
  };

  return <div className="card border-0 shadow-sm p-4 rounded-3 border-top border-3 border-success">
    <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Detalle de PQRS</h2><Link to="/pqrs" className="btn btn-outline-success rounded-pill px-3">← Volver</Link></div>
    {editing ? <form onSubmit={savePqrs}><FormField label="Asunto" name="asunto" value={pqrs.asunto} onChange={(e) => setPqrs({ ...pqrs, asunto: e.target.value })} required /><FormField label="Descripcion" name="cuerpo" value={pqrs.cuerpo} onChange={(e) => setPqrs({ ...pqrs, cuerpo: e.target.value })} required /><button className="btn btn-primary me-2">Guardar</button><button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(false)}>Cancelar</button></form> : <dl className="row">{[['Solicitante', pqrs.usuario ? `${pqrs.usuario.primerNombre} ${pqrs.usuario.primerApellido}` : pqrs.idUsuario], ['Asunto', pqrs.asunto], ['Descripcion', pqrs.cuerpo], ['Fecha', pqrs.fechaHora], ['Estado', pqrs.estado], ['Anexos', pqrs.anexos?.join(', ') || '-']].map(([label, value]) => <div className="row" key={label}><dt className="col-sm-3">{label}</dt><dd className="col-sm-9">{value || '-'}</dd></div>)}</dl>}
    {isOwner && !canEditOwn && Number(pqrs.estado) === 1 && <p className="text-muted small">La edicion de esta PQRS esta disponible solo durante los primeros 5 minutos.</p>}
    {canEditOwn && <button className="btn btn-outline-primary mb-3" onClick={() => setEditing(true)}>Editar PQRS</button>}
    {pqrs.respuesta && <div className="border-start border-4 border-success ps-3 mb-3"><h3 className="h5">Respuesta registrada</h3><ResponseForm initialData={{ asunto: pqrs.respuesta.asunto, cuerpo: pqrs.respuesta.cuerpo }} readOnly={!canEditResponse} onSubmit={editAnswer} />{isAdmin && !canEditResponse && <p className="text-muted small mt-2 mb-0">La edicion de esta respuesta esta disponible solo durante los primeros 5 minutos.</p>}<p className="mb-1"><strong>Fecha:</strong> {pqrs.respuesta.fechaHora || '-'}</p><p className="mb-0"><strong>Respondiente:</strong> {pqrs.respuesta.respondiente || pqrs.respuesta.idUsuarioAdministrador || '-'} · <strong>Estado:</strong> {pqrs.estado}</p></div>}
    {isAdmin && !pqrs.tieneRespuesta && <><h3 className="h5 mt-3">Responder PQRS</h3><ResponseForm initialData={{ asunto: `Re: ${pqrs.asunto}` }} onSubmit={respond} /></>}
    {message && <div className="alert alert-info mt-3 mb-0">{message}</div>}
  </div>;
};
