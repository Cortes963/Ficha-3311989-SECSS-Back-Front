import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import { FormField } from '@/components/ui/FormField';

export const GuestRegistrationPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ tipo_documento: 'CC', numero_documento: '', primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', n_celular: '', correo: '', expira_en: '', tipo_vehiculo: 'MOTO', marca: '', color: '' });
  const [message, setMessage] = useState('');
  const change = (event) => setData((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    try {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => form.append(key, value));
      const result = await apiClient.post('/input_output/invitado', form);
      const credentials = result.credenciales_temporales;
      setMessage(credentials
        ? `${result.mensaje} Correo: ${credentials.correo}. Contraseña temporal: ${credentials.password}`
        : result.mensaje);
      if (!credentials) setTimeout(() => navigate('/entradas-salidas'), 800);
    } catch (error) { setMessage(error.message); }
  };
  return <form className="card p-4" onSubmit={submit}><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Registrar invitado e ingreso</h2><Link to="/entradas-salidas" className="btn btn-outline-secondary">Volver</Link></div><div className="row g-3"><div className="col-md-4"><label className="form-label">Tipo documento</label><select className="form-select" name="tipo_documento" value={data.tipo_documento} onChange={change}><option>CC</option><option>CE</option><option>PPT</option></select></div>{['numero_documento','primer_nombre','segundo_nombre','primer_apellido','segundo_apellido','n_celular','correo','expira_en','marca','color'].map((name) => <div className="col-md-4" key={name}><FormField label={name.replaceAll('_', ' ')} name={name} type={name === 'correo' ? 'email' : name === 'expira_en' ? 'datetime-local' : 'text'} value={data[name]} onChange={change} required={!['segundo_nombre','segundo_apellido'].includes(name)} /></div>)}<div className="col-md-4"><label className="form-label">Tipo vehículo</label><select className="form-select" name="tipo_vehiculo" value={data.tipo_vehiculo} onChange={change}><option>MOTO</option><option>BICICLETA</option></select></div></div><button className="btn btn-primary mt-3">Registrar invitado e ingreso</button>{message && <div className="alert alert-info mt-3">{message}</div>}</form>;
};
