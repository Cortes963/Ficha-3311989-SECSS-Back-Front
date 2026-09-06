// src/modules/<modulo>/components/NOMBREForm.jsx
import { useState } from 'react';

export const NOMBREForm = ({ initialData = {}, onSubmit, readOnly = false }) => {
  const [form, setForm] = useState({
    campo_texto: initialData.campo_texto || '',
    campo_numero: initialData.campo_numero || '',
    campo_fecha: initialData.campo_fecha || '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form); // el padre decide si es crear o modificar
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 shadow-sm border-0">
      <div className="mb-3">
        <label className="form-label">Campo de texto</label>
        <input
          type="text" name="campo_texto" className="form-control"
          value={form.campo_texto} onChange={handleChange}
          disabled={readOnly} required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Campo numérico</label>
        <input
          type="number" name="campo_numero" className="form-control"
          value={form.campo_numero} onChange={handleChange}
          disabled={readOnly} required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Fecha</label>
        <input
          type="date" name="campo_fecha" className="form-control"
          value={form.campo_fecha} onChange={handleChange}
          disabled={readOnly}
        />
      </div>
      {!readOnly && (
        <button type="submit" className="btn btn-primary">Guardar</button>
      )}
    </form>
  );
};