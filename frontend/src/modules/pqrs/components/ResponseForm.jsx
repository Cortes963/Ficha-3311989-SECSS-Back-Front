import { useState } from 'react';

export const ResponseForm = ({ initialData = {}, readOnly = false, onSubmit }) => {
  const [form, setForm] = useState({ asunto: initialData.asunto || '', cuerpo: initialData.cuerpo || '' });
  const submit = (event) => { event.preventDefault(); onSubmit?.(form); };
  return <form onSubmit={submit} className="card p-3 border-0 bg-light">
    <label className="form-label">Asunto de la respuesta</label>
    <input className="form-control mb-2" value={form.asunto} disabled={readOnly} onChange={(e) => setForm({ ...form, asunto: e.target.value })} required />
    <label className="form-label">Respuesta</label>
    <textarea className="form-control mb-3" rows="5" value={form.cuerpo} disabled={readOnly} onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} required />
    {!readOnly && <button className="btn btn-primary" type="submit">Enviar respuesta</button>}
  </form>;
};
