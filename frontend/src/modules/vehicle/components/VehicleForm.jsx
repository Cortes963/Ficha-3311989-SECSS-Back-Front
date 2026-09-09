// src/modules/vehicle/components/VehicleForm.jsx
import { useState, useEffect } from 'react';

export const VehicleForm = ({ initialData = null, readOnly = false, onSubmit = null }) => {
  const [tipoVehiculo, setTipoVehiculo] = useState('moto');
  const [formData, setFormData] = useState({
    placa: '',
    cilindraje: '',
    marca: '',
    modelo: '',
    color: '',
    numeroMarco: '',
    tipoBicicleta: ''
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
        detalles: bloqueDetalles
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