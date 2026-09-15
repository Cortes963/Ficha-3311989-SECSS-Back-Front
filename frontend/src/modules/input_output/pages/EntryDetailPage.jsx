import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { obtenerEntradaSalida } from '@/modules/input_output/services/input_outputservice';

export const EntryDetailPage = () => {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { obtenerEntradaSalida(id).then(setRow).catch((e) => setError(e.message)); }, [id]);
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!row) return <div className="alert alert-info">Cargando registro de entrada/salida...</div>;
  const estado = row.fecha_hora_salida ? 'FUERA' : 'DENTRO';
  return <div className="card p-4 border-0 shadow-sm">
    <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Detalle de entrada/salida</h2><Link to="/entradas-salidas" className="btn btn-outline-secondary">Volver</Link></div>
    <dl className="row mb-0">{[['Registro', row.registro_id || row.id], ['Persona', row.persona_ingresa], ['Documento', row.documento_persona], ['Vehículo', `${row.tipo_vehiculo || ''} ${row.marca || ''}`], ['Identificador', row.identificador_vehiculo], ['Ingreso', row.fecha_hora_ingreso], ['Salida', row.fecha_hora_salida || 'Dentro'], ['Celador de ingreso', row.celador_ingreso], ['Celador de salida', row.celador_salida], ['Estado', row.estado || estado]].map(([label, value]) => <div className="row" key={label}><dt className="col-sm-4">{label}</dt><dd className="col-sm-8">{value || '—'}</dd></div>)}</dl>
  </div>;
};
