import { useEffect, useState } from 'react';
import { crearCentro, editarCentro, listarCentros } from '@/modules/core/services/centerService';
import { DataTable } from '@/components/ui/DataTable';

export const CentersPage = () => {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError('');
    try { setRows(await listarCentros()); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  // The state updates happen after the asynchronous API request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);
  const save = async (event) => {
    event.preventDefault();
    try {
      if (editing) await editarCentro(editing.id, name.trim());
      else await crearCentro(name.trim());
      setName('');
      setEditing(null);
      await load();
    } catch (e) { setError(e.message); }
  };
  return <><form className="card p-3 mb-3" onSubmit={save}><div className="d-flex gap-2"><input className="form-control" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del centro" required /><button className="btn btn-primary" disabled={loading}>{editing ? 'Guardar cambios' : 'Registrar'}</button>{editing && <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditing(null); setName(''); }}>Cancelar</button>}</div></form><DataTable title="Centros de formación" loading={loading} columns={[{ key: 'id', label: 'ID' }, { key: 'nombre_centro', label: 'Nombre' }, { key: 'acciones', label: 'Acciones', render: (row) => <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditing(row); setName(row.nombre_centro); }}>Editar</button> }]} rows={rows} />{error && <div className="alert alert-danger mt-3"><div>{error}</div><button className="btn btn-sm btn-outline-danger mt-2" onClick={load}>Reintentar</button></div>}</>;
};
