import { useEffect, useState } from 'react';
import { crearReporte } from '@/modules/pqrs/services/reporteService';
import { listarEntradasSalidas } from '@/modules/input_output/services/input_outputservice';
import { FormField } from '@/components/ui/FormField';
import { Link } from 'react-router-dom';

export const ReportCreatePage = () => {
  const [data, setData] = useState({ asunto: '', cuerpo: '', idEntradaSalida: '' });
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState('');
  useEffect(() => { listarEntradasSalidas().then(setEntries).catch(() => setEntries([])); }, []);
  const submit = async (event) => { event.preventDefault(); try { const result = await crearReporte(data); setMessage(result.mensaje); setData({ asunto: '', cuerpo: '', idEntradaSalida: '' }); } catch (e) { setMessage(e.message); } };
  return <form className="card p-4 border-0 shadow-sm" onSubmit={submit}><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Registrar reporte</h2><Link to="/reportes" className="btn btn-outline-secondary">Volver a la lista</Link></div><FormField label="Asunto" name="asunto" value={data.asunto} onChange={(e) => setData({ ...data, asunto: e.target.value })} required /><FormField label="Descripción" name="cuerpo" value={data.cuerpo} onChange={(e) => setData({ ...data, cuerpo: e.target.value })} required /><label className="form-label">Entrada/salida relacionada (opcional)</label><select className="form-select mb-3" value={data.idEntradaSalida} onChange={(e) => setData({ ...data, idEntradaSalida: e.target.value })}><option value="">Sin relación</option>{entries.map((entry) => <option key={entry.registro_id || entry.id} value={entry.registro_id || entry.id}>#{entry.registro_id || entry.id} · {entry.fecha_hora_ingreso || ''} · {entry.identificador_vehiculo || ''}</option>)}</select><button className="btn btn-primary">Guardar reporte</button>{message && <div className="alert alert-info mt-3">{message}</div>}</form>;
};
