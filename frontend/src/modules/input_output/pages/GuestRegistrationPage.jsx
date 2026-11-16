import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import { FormField } from '@/components/ui/FormField';

export const GuestRegistrationPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ tipo_documento: 'CC', numero_documento: '', primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', n_celular: '', correo: '', tipo_vehiculo: 'MOTO', marca: '', color: '', placa: '', cilindraje: '', modelo: '', numero_marco: '', clase_bicicleta: '' });
  const [message, setMessage] = useState('');
  const change = (event) => setData((current) => ({ ...current, [event.target.name]: event.target.value }));
  const motorcycle = data.tipo_vehiculo === 'MOTO';
  const optionalFields = ['segundo_nombre', 'segundo_apellido'];
  const guestFields = ['numero_documento', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'n_celular', 'correo', 'marca', 'color'];
  const motorcycleFields = ['placa', 'cilindraje', 'modelo'];

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
  return (
    <form className="card p-4" onSubmit={submit}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Registrar invitado e ingreso</h2>
        <Link to="/entradas-salidas" className="btn btn-outline-secondary">Volver</Link>
      </div>
      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor="tipo_documento">Tipo documento</label>
          <select className="form-select" id="tipo_documento" name="tipo_documento" value={data.tipo_documento} onChange={change}>
            <option>CC</option><option>CE</option><option>PPT</option>
          </select>
        </div>
        {guestFields.map((name) => (
          <div className="col-md-4" key={name}>
            <FormField
              label={name.replaceAll('_', ' ')}
              name={name}
              type={name === 'correo' ? 'email' : 'text'}
              value={data[name]}
              onChange={change}
              required={!optionalFields.includes(name)}
            />
          </div>
        ))}
        <div className="col-md-4">
          <label className="form-label" htmlFor="tipo_vehiculo">Tipo vehículo</label>
          <select className="form-select" id="tipo_vehiculo" name="tipo_vehiculo" value={data.tipo_vehiculo} onChange={change}>
            <option>MOTO</option><option>BICICLETA</option>
          </select>
        </div>
        {motorcycle ? motorcycleFields.map((name) => (
          <div className="col-md-4" key={name}>
            <FormField
              label={name.replaceAll('_', ' ')}
              name={name}
              type={name === 'placa' ? 'text' : 'number'}
              value={data[name]}
              onChange={change}
              required
              min={name === 'cilindraje' ? 50 : name === 'modelo' ? 1970 : undefined}
              max={name === 'cilindraje' ? 2000 : name === 'modelo' ? new Date().getFullYear() + 1 : undefined}
              maxLength={name === 'placa' ? 6 : undefined}
              pattern={name === 'placa' ? '[A-Za-z]{3}[0-9]{2}[A-Za-z0-9]' : undefined}
            />
          </div>
        )) : (
          <>
            <div className="col-md-4">
              <FormField label="Número de marco" name="numero_marco" value={data.numero_marco} onChange={change} required minLength={5} />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="clase_bicicleta">Clase de bicicleta</label>
              <select className="form-select" id="clase_bicicleta" name="clase_bicicleta" value={data.clase_bicicleta} onChange={change} required>
                <option value="">Seleccione...</option>
                {['Montaña', 'Ruta', 'Urbana', 'Electrica'].map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
          </>
        )}
        <p className="col-12 text-muted mb-0">La cuenta del invitado vence automáticamente a los seis meses.</p>
      </div>
      <button className="btn btn-primary mt-3">Registrar invitado e ingreso</button>
      {message && <div className="alert alert-info mt-3">{message}</div>}
    </form>
  );
};
