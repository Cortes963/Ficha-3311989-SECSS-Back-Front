// src/modules/user/components/ApprenForm.jsx
import { useState, useEffect } from 'react';

export const ApprenForm = ({ initialData = null, readOnly = false, onSubmit = null }) => {
  const [aprendizData, setAprendizData] = useState({
    numeroFicha: '',
    direccion: '',
    idCentro: '',
    fechaVinculacion: '', // Campos de control de interfaz de usuario preservados
    fechaTerminacion: ''
  });

  // Mapeo corregido uno a uno con db.json
  useEffect(() => {
    if (initialData) {
      setAprendizData({
        numeroFicha: initialData.ficha || '', 
        direccion: initialData.direccion || '',
        idCentro: initialData.id_centro || '',
        fechaVinculacion: initialData.fechaVinculacion || '',
        fechaTerminacion: initialData.fechaTerminacion || ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAprendizData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      // El backend guarda detalle_aprendiz.id_centro como llave foránea
      // numérica hacia la tabla centro (ver Backend/controller/auth.controller.js).
      // No existe hoy un endpoint público para listar centros y mostrar sus
      // nombres, así que por ahora se pide el ID directamente. Falta un
      // GET /api/core/centros (o similar) para reemplazar esto por un <select>.
      const dataParaServidor = {
        ficha: Number(aprendizData.numeroFicha),
        direccion: aprendizData.direccion,
        id_centro: Number(aprendizData.idCentro),
        // Conservamos los extras si los necesitas a futuro
        fechaVinculacion: aprendizData.fechaVinculacion,
        fechaTerminacion: aprendizData.fechaTerminacion
      };
      onSubmit(dataParaServidor);
    }
  };

  return (
    <div className="card shadow-sm border-0 border-start border-success border-3 mb-4 animate__animated animate__fadeIn">
      <div className="card-body p-4">
        <h5 className="card-title text-success fw-bold mb-4">
          <i className="bi bi-mortarboard-fill me-2"></i> Vinculación de Datos Académicos (APRENDIZ)
        </h5>
        
        <form onSubmit={handleFormSubmit} className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-bold text-secondary">Número de Ficha</label>
            <input 
              type="number" 
              className="form-control" 
              name="numeroFicha"
              value={aprendizData.numeroFicha}
              onChange={handleChange}
              placeholder="Ej: 2617482" 
              readOnly={readOnly}
              required={!readOnly} 
            />
          </div>
          
          <div className="col-md-6">
            <label className="form-label small fw-bold text-secondary">Dirección</label>
            <input 
              type="text" 
              className="form-control" 
              name="direccion"
              value={aprendizData.direccion}
              onChange={handleChange}
              placeholder="Ej: kr 12 # 34-56" 
              readOnly={readOnly}
              required={!readOnly} 
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small fw-bold text-secondary">Fecha de Vinculación</label>
            <input 
              type="date" 
              className="form-control" 
              name="fechaVinculacion"
              value={aprendizData.fechaVinculacion}
              onChange={handleChange}
              disabled={readOnly}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small fw-bold text-secondary">Fecha de Terminación</label>
            <input 
              type="date" 
              className="form-control" 
              name="fechaTerminacion"
              value={aprendizData.fechaTerminacion}
              onChange={handleChange}
              disabled={readOnly}
            />
          </div>

          <div className="col-12">
            <label className="form-label small fw-bold text-secondary">ID del Centro de Formación</label>
            <input 
              type="number" 
              className="form-control" 
              name="idCentro"
              value={aprendizData.idCentro}
              onChange={handleChange}
              placeholder="Ej: 1 (ID del centro, no el nombre)" 
              readOnly={readOnly}
              required={!readOnly} 
            />
            <small className="text-muted d-block mt-1">
              Temporal: aún no hay un listado de centros por nombre; pide el ID al equipo de administración.
            </small>
          </div>

          <div className="col-12 mt-4">
            {readOnly ? (
              <div className="p-3 border rounded bg-light text-center border-dashed">
                <i className="bi bi-shield-check text-success fs-3 mb-2 d-block"></i>
                <span className="small fw-semibold text-muted d-block">Documentación Académica Verificada</span>
              </div>
            ) : (
              <div className="p-3 border rounded bg-light border-success border-opacity-25">
                <p className="small fw-bold text-success text-uppercase mb-3">
                  <i className="bi bi-file-earmark-arrow-up me-2"></i>Documentación del Aprendiz
                </p>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Foto del Carné</label>
                    <input type="file" className="form-control form-control-sm" accept="image/*" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Documento Digital</label>
                    <input type="file" className="form-control form-control-sm" accept="image/*,.pdf" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Foto Perfil</label>
                    <input type="file" className="form-control form-control-sm" accept="image/*" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="col-12 text-center mt-4">
              <button type="submit" className="btn btn-success px-5 py-2 fw-bold shadow-sm">
                <i className="bi bi-save me-2"></i> Guardar Aprendiz
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};