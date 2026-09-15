import { useEffect, useState } from 'react';
import { listarCentros } from '@/modules/core/services/centerService';
import { DataTable } from '@/components/ui/DataTable';

export const CentersPage = () => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { listarCentros().then(setRows).catch((e) => setError(e.message)); }, []);
  const actions = <div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" disabled title="Contrato backend pendiente">Registrar</button><button className="btn btn-sm btn-outline-secondary" disabled title="Contrato backend pendiente">Editar</button></div>;
  return <><DataTable title="Centros de formación" columns={[{ key: 'id', label: 'ID' }, { key: 'nombre_centro', label: 'Nombre' }]} rows={rows} actions={actions} />{error && <div className="alert alert-danger mt-3">{error}</div>}<p className="text-muted mt-3">Registro y edición quedan deshabilitados hasta que el backend exponga esos contratos.</p></>;
};
