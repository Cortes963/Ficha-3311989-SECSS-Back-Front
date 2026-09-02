// src/components/forms/UserAccountForm.jsx
import { useState, useEffect } from 'react';

export const UserAccountForm = ({ initialData = null, readOnly = false, onSubmit = null }) => {
  
  const [formData, setFormData] = useState({
    tipoDoc: 'CC',
    documento: '',
    nombre1: '',
    nombre2: '',
    apellido1: '',
    apellido2: '',
    telefono: '',
    correo: '',
    password: ''
  });

  // Efecto vital corregido y adaptado estrictamente al esquema db.json
  useEffect(() => {
    if (initialData) {
      // Segmentamos el string "nombre_completo" de la base de datos
      const nombrespartes = initialData.nombre_completo ? initialData.nombre_completo.split(' ') : [];
      
      setFormData({
        // Mapeo adaptado a snake_case de la base de datos
        tipoDoc: initialData.tipo_documento || 'CC',
        documento: initialData.numero_documento || '',
        telefono: initialData.n_celular || '',
        correo: initialData.correo || '',
        password: initialData.password || '',
        
        // Distribución inteligente de la cadena nombre_completo
        nombre1: nombrespartes[0] || '',
        nombre2: nombrespartes.length === 4 ? nombrespartes[1] : (nombrespartes.length === 3 ? '' : ''),
        apellido1: nombrespartes.length === 4 ? nombrespartes[2] : (nombrespartes.length === 3 ? nombrespartes[1] : nombrespartes[1] || ''),
        apellido2: nombrespartes.length === 4 ? nombrespartes[3] : (nombrespartes.length === 3 ? nombrespartes[2] : nombrespartes[2] || '')
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
      // Re-ensamblamos el objeto para cumplir estrictamente con el contrato de db.json
      const nombreCompletoConstruido = `${formData.nombre1} ${formData.nombre2} ${formData.apellido1} ${formData.apellido2}`.replace(/\s+/g, ' ').trim();
      
      const dataParaServidor = {
        tipo_documento: formData.tipoDoc,
        numero_documento: formData.documento,
        nombre_completo: nombreCompletoConstruido,
        n_celular: formData.telefono,
        correo: formData.correo,
        password: formData.password
      };
      
      onSubmit(dataParaServidor);
    }
  };

  return (
    <div className="card shadow-sm border-0 mb-4 animate__animated animate__fadeIn">
      <div className="card-header bg-secss-main text-white p-3">
        <h4 className="m-0">
          <i className="bi bi-person-plus-fill me-2"></i> Datos de la Cuenta
        </h4>
      </div>
      <div className="card-body p-4">
        <form className="row g-4" onSubmit={handleSubmit}>
          
          <div className="col-lg-6 pe-lg-4 border-end">
            <h5 className="section-title text-success mb-3">
              <i className="bi bi-card-id me-2"></i>Datos Personales
            </h5>
            
            <div className="row g-2 mb-3">
              <div className="col-md-4">
                <label className="form-label small fw-bold">Tipo Doc.</label>
                <select className="form-select" name="tipoDoc" value={formData.tipoDoc} onChange={handleChange} disabled={readOnly}>
                  <option value="CC">C.C.</option>
                  <option value="TI">T.I.</option>
                  <option value="CE">C.E.</option>
                  <option value="PEP">P.E.P.</option>
                  <option value="PPT">P.P.T.</option>
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label small fw-bold">Número de Documento</label>
                <input type="text" className="form-control" name="documento" value={formData.documento} onChange={handleChange} disabled={readOnly} required={!readOnly} />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold">Primer Nombre</label>
                <input type="text" className="form-control" name="nombre1" value={formData.nombre1} onChange={handleChange} disabled={readOnly} required={!readOnly} />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Segundo Nombre</label>
                <input type="text" className="form-control" name="nombre2" value={formData.nombre2} onChange={handleChange} disabled={readOnly} />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold">Primer Apellido</label>
                <input type="text" className="form-control" name="apellido1" value={formData.apellido1} onChange={handleChange} disabled={readOnly} required={!readOnly} />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Segundo Apellido</label>
                <input type="text" className="form-control" name="apellido2" value={formData.apellido2} onChange={handleChange} disabled={readOnly} />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold">Teléfono de Contacto</label>
              <input type="tel" className="form-control" name="telefono" value={formData.telefono} onChange={handleChange} disabled={readOnly} required={!readOnly} />
            </div>
          </div>

          <div className="col-lg-6 ps-lg-4">
            <h5 className="section-title text-primary mb-3">
              <i className="bi bi-shield-lock me-2"></i>Credenciales de Cuenta
            </h5>
            
            <div className="p-4 bg-light border rounded">
              <div className="mb-3">
                <label className="form-label small fw-bold">Correo Electrónico</label>
                <input type="email" className="form-control" name="correo" value={formData.correo} onChange={handleChange} disabled={readOnly} required={!readOnly} />
              </div>

              {!readOnly && (
                <div className="mb-3">
                  <label className="form-label small fw-bold">Contraseña de Acceso</label>
                  <input type="password" className="form-control" name="password" value={formData.password} onChange={handleChange} disabled={readOnly} required={!readOnly} />
                </div>
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="col-12 text-center mt-4">
              <button type="submit" className="btn btn-primary px-5 py-2 fw-bold shadow-sm">
                <i className="bi bi-save me-2"></i> GUARDAR USUARIO Y CUENTA
              </button>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};