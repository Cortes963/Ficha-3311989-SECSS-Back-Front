import { useEffect, useState } from 'react';
import { obtenerMiCupo } from '@/modules/quota/services/Quotaservices';

export const MyQuotaSummaryPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { obtenerMiCupo().then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="alert alert-info">Cargando cupo...</div>;
  return <div className="card p-4 border-0 shadow-sm"><h2 className="h4">Mi cupo</h2>{data.vehiculo ? <dl className="row mb-0"><dt className="col-sm-4">Tipo</dt><dd className="col-sm-8">{data.vehiculo.tipo_vehiculo}</dd><dt className="col-sm-4">Marca</dt><dd className="col-sm-8">{data.vehiculo.marca}</dd><dt className="col-sm-4">Estado</dt><dd className="col-sm-8">{data.vehiculo.estado_cupo ? 'Activo' : 'Inactivo'}</dd></dl> : <p className="text-muted mb-0">No hay vehículo asociado.</p>}</div>;
};
