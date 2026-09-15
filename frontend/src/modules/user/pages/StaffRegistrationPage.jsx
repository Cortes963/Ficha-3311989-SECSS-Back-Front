/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { UserAccountForm } from '@/modules/user/components/UserAccountForm';
import { apiClient } from '@/services/apiClient';
import { buscarUsuariosElegibles } from '@/modules/user/services/userService';

export const StaffRegistrationPage = ({ role }) => {
  const [existingId, setExistingId] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('new');
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const targetRole = role === 'CELADOR' ? 'CELADOR' : 'JEFE_SEGURIDAD';
  useEffect(() => {
    if (mode !== 'existing' || query.trim().length < 2) { setCandidates([]); return undefined; }
    const timer = setTimeout(() => buscarUsuariosElegibles(query, targetRole).then(setCandidates).catch((error) => setMessage(error.message)), 250);
    return () => clearTimeout(timer);
  }, [mode, query, targetRole]);
  const submit = async (data) => {
    try {
      const endpoint = role === 'CELADOR' ? '/users/celador' : '/users/jefe';
      const payload = mode === 'existing' ? { id_usuario: Number(existingId) } : { usuario: data };
      const response = await apiClient.post(endpoint, payload);
      const credentials = response.credenciales_temporales;
      setMessage(credentials ? `Creado. Correo: ${credentials.correo}. Contraseña temporal: ${credentials.password}` : response.mensaje);
    } catch (error) { setMessage(error.message); }
  };
  return <section><h2 className="h4 mb-3">{role === 'CELADOR' ? 'Registrar o asignar celador' : 'Registrar o asignar jefe de seguridad'}</h2><div className="btn-group mb-3"><button type="button" className={`btn ${mode === 'new' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('new')}>Usuario nuevo</button><button type="button" className={`btn ${mode === 'existing' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('existing')}>Usuario existente</button></div>{mode === 'existing' ? <form className="card p-4" onSubmit={(event) => { event.preventDefault(); if (!existingId) setMessage('Seleccione un usuario elegible.'); else submit(null); }}><label className="form-label">Buscar por nombre o documento</label><input className="form-control mb-3" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mínimo 2 caracteres" /><div className="list-group mb-3">{candidates.map((candidate) => <button type="button" key={candidate.id} className={`list-group-item list-group-item-action ${String(existingId) === String(candidate.id) ? 'active' : ''}`} onClick={() => setExistingId(candidate.id)}><strong>{candidate.nombre}</strong> · {candidate.tipo_documento} {candidate.numero_documento}<small className="d-block">{candidate.roles?.join(', ') || 'Sin rol activo'}</small></button>)}</div><div className="small mb-3">{existingId ? `Usuario seleccionado: ${existingId}` : 'Ningún usuario seleccionado'}</div><button className="btn btn-primary" disabled={!existingId}>Asignar rol</button></form> : <UserAccountForm onSubmit={submit} />} {message && <div className="alert alert-info mt-3">{message}</div>}</section>;
};
