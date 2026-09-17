/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { storageUrl } from '@/utils/media';

export const VehicleForm = ({ initialData = null, readOnly = false, onSubmit = null }) => {
  const [tipoVehiculo, setTipoVehiculo] = useState('moto');
  const [formData, setFormData] = useState({
    placa: '',
    cilindraje: '',
    marca: '',
    modelo: '',
    color: '',
    numeroMarco: '',
    tipoBicicleta: '',
    imagen_url_tarjeta_propiedad: null,
    imagen_url_identificacion_vehiculo: null,
    imagen_url_vehiculo: null,
    imagen_url_soat: null,
    imagen_url_tecnomecanica_vigente: null
  });

  useEffect(() => {
    if (initialData) {
      const tipoDelServidor = (initialData.tipo_vehiculo || 'moto').toLowerCase();
      setTipoVehiculo(tipoDelServidor);
      
      // Corrección crítica: db.json usa 'detalles' en plural
      const subDetalles = initialData.detalles || {};

      setFormData({
        marca: initialData.marca || '',
        color: initialData.color || '',
        placa: subDetalles.placa || '',
        cilindraje: subDetalles.cilindraje || '',
        modelo: subDetalles.modelo || '',
        numeroMarco: subDetalles.numero_marco || '',
        // Corrección crítica: db.json usa 'clase_bicicleta'
        tipoBicicleta: subDetalles.clase_bicicleta || ''
        ,imagen_url_tarjeta_propiedad: initialData.imagen_url_tarjeta_propiedad || null
        ,imagen_url_identificacion_vehiculo: initialData.imagen_url_identificacion_vehiculo || null
        ,imagen_url_vehiculo: initialData.imagen_url_vehiculo || null
        ,imagen_url_soat: subDetalles.imagen_url_soat || null
        ,imagen_url_tecnomecanica_vigente: subDetalles.imagen_url_tecnomecanica_vigente || null
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      // Construimos el bloque "detalles" dependiendo del vehículo
      const bloqueDetalles = tipoVehiculo === 'moto' 
        ? {
            placa: formData.placa.toUpperCase(),
            cilindraje: Number(formData.cilindraje),
            modelo: formData.modelo
          }
        : {
            numero_marco: formData.numeroMarco,
            clase_bicicleta: formData.tipoBicicleta
          };

      // Emitimos el objeto limpio al componente padre
      onSubmit({
        tipo_vehiculo: tipoVehiculo.toUpperCase(),
        marca: formData.marca,
        color: formData.color,
        detalles: bloqueDetalles,
        imagenes: Object.fromEntries(Object.entries(formData).filter(([key]) => key.startsWith('imagen_')))
      });
    }
  };

  return (
    <div className="card card-registro shadow-lg border-0 mb-4 animate__animated animate__fadeIn">
      <div className="card-header text-center p-4">
        <h2 className="fw-bold m-0">Matrícula de Vehículos</h2>
      </div>
      <div className="card-body p-4">
        <form onSubmit={handleSubmit}>
          
          <div className="mb-4">
            <label className="form-label fw-bold">Tipo de Vehículo</label>
            <select className="form-select form-select-lg" value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} disabled={readOnly}>
              <option value="moto">Motocicleta</option>
              <option value="bicicleta">Bicicleta</option>
            </select>
          </div>

          <h5 className="text-secondary border-bottom pb-2 mb-3">Especificaciones Técnicas</h5>

          {tipoVehiculo === 'moto' && (
            <div className="row g-3 animate__animated animate__fadeIn">
              <div className="col-md-4">
                <label className="form-label small fw-bold">Placa de la Moto</label>
                <input type="text" className="form-control text-uppercase" name="placa" value={formData.placa} onChange={handleChange} disabled={readOnly} required={!readOnly}/>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Cilindraje (c.c.)</label>
                <input type="number" className="form-control" name="cilindraje" value={formData.cilindraje} onChange={handleChange} disabled={readOnly} required={!readOnly}/>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Modelo (Año)</label>
                <input type="number" className="form-control" name="modelo" value={formData.modelo} onChange={handleChange} disabled={readOnly} required={!readOnly}/>
              </div>
            </div>
          )}

          {tipoVehiculo === 'bicicleta' && (
            <div className="row g-3 animate__animated animate__fadeIn">
              <div className="col-md-6">
                <label className="form-label small fw-bold">Número de Serial / Marco</label>
                <input type="text" className="form-control" name="numeroMarco" value={formData.numeroMarco} onChange={handleChange} disabled={readOnly} required={!readOnly}/>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Tipo de Bicicleta</label>
                <select className="form-select" name="tipoBicicleta" value={formData.tipoBicicleta} onChange={handleChange} disabled={readOnly} required={!readOnly}>
                  <option value="">Seleccione...</option>
                  <option value="Montaña">Bicicleta de Montaña (MTB)</option>
                  <option value="Ruta">Bicicleta de Ruta</option>
                  <option value="Urbana">Bicicleta Urbana / Clásica</option>
                  <option value="Electrica">Bicicleta Eléctrica</option>
                </select>
              </div>
            </div>
          )}

          <div className="row g-3 mt-2">
            <div className="col-md-6">
              <label className="form-label small fw-bold">Marca</label>
              <input type="text" className="form-control" name="marca" value={formData.marca} onChange={handleChange} disabled={readOnly} required={!readOnly}/>
            </div>
            <div className="row g-3 mt-3">
              {['imagen_url_tarjeta_propiedad', 'imagen_url_identificacion_vehiculo', 'imagen_url_vehiculo', ...(tipoVehiculo === 'moto' ? ['imagen_url_soat', 'imagen_url_tecnomecanica_vigente'] : [])].map((name) => (
                <div className="col-md-4" key={name}>
                  <label className="form-label small fw-bold">{name.replace('imagen_url_', '').replaceAll('_', ' ')}</label>
                  {formData[name] && typeof formData[name] === 'string' && <img className="img-thumbnail d-block mb-2" style={{ maxHeight: 100 }} src={storageUrl(formData[name])} alt={name} />}
                  {!readOnly && <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFormData((current) => ({ ...current, [name]: event.target.files?.[0] || null }))} />}
                </div>
              ))}
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold">Color Principal</label>
              <input type="text" className="form-control" name="color" value={formData.color} onChange={handleChange} disabled={readOnly} required={!readOnly}/>
            </div>
          </div>

          {!readOnly && (
            <div className="text-center mt-4">
              <button type="submit" className="btn btn-primary px-5 py-2 fw-bold">GUARDAR VEHÍCULO</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};