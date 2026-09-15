import { useState } from 'react';
import { crearReporte } from '@/modules/pqrs/services/reporteService';
import { FormField } from '@/components/ui/FormField';

export const ReportCreatePage = () => {
  const [data, setData] = useState({ asunto: '', cuerpo: '' });
  const [message, setMessage] = useState('');
  const submit = async (event) => { event.preventDefault(); try { const result = await crearReporte(data); setMessage(result.mensaje); setData({ asunto: '', cuerpo: '' }); } catch (e) { setMessage(e.message); } };
  return <form className="card p-4 border-0 shadow-sm" onSubmit={submit}><h2 className="h4">Registrar reporte</h2><FormField label="Asunto" name="asunto" value={data.asunto} onChange={(e) => setData({ ...data, asunto: e.target.value })} required /><FormField label="Descripción" name="cuerpo" value={data.cuerpo} onChange={(e) => setData({ ...data, cuerpo: e.target.value })} required /><button className="btn btn-primary">Guardar reporte</button>{message && <div className="alert alert-info mt-3">{message}</div>}</form>;
};
