/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { listarCentrosPublicos } from '@/modules/core/services/centerService';
import { storageUrl } from '@/utils/media';

export const ApprenForm = ({ initialData = null, readOnly = false, onSubmit = null }) => {
  const [aprendizData, setAprendizData] = useState({
    numeroFicha: '',
    direccion: '',
    idCentro: '',
    fechaVinculacion: '', // Campos de control de interfaz de usuario preservados
    fechaTerminacion: ''
    ,imagenes: {}
  });
  const [centros, setCentros] = useState([]);

  // Mapeo corregido uno a uno con db.json
  useEffect(() => {
    listarCentrosPublicos().then(setCentros).catch(() => setCentros([]));
    if (initialData) {
      setAprendizData({
        numeroFicha: initialData.ficha || '', 
        direccion: initialData.direccion || '',
        idCentro: initialData.id_centro || '',
        fechaVinculacion: (initialData.fecha_vinculacion || initialData.fechaVinculacion || '').slice(0, 10),
        fechaTerminacion: (initialData.fecha_terminacion || initialData.fechaTerminacion || '').slice(0, 10)
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
      const dataParaServidor = {
        ficha: aprendizData.numeroFicha.trim(),
        direccion: aprendizData.direccion,
        id_centro: Number(aprendizData.idCentro),
        // Conservamos los extras si los necesitas a futuro
        fecha_vinculacion: aprendizData.fechaVinculacion,
        fecha_terminacion: aprendizData.fechaTerminacion || null,
        imagenes: aprendizData.imagenes
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
              type="text"
              maxLength={50}
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
              required={!readOnly}
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
            <label className="form-label small fw-bold text-secondary">Centro de Formación</label>
            {readOnly ? (
              <input type="text" className="form-control" value={initialData?.nombre_centro || centros.find((centro) => Number(centro.id) === Number(aprendizData.idCentro))?.nombre_centro || 'Centro no informado'} readOnly />
            ) : (
              <select className="form-select" value={aprendizData.idCentro} onChange={(event) => setAprendizData((previous) => ({ ...previous, idCentro: event.target.value }))} required>
                <option value="">Seleccione un centro</option>
                {centros.map((centro) => <option key={centro.id} value={centro.id}>{centro.nombre_centro}</option>)}
              </select>
            )}
          </div>

          <div className="col-12 mt-4">
            <div className="p-3 border rounded bg-light border-success border-opacity-25">
                <p className="small fw-bold text-success text-uppercase mb-3">
                  <i className="bi bi-file-earmark-arrow-up me-2"></i>Documentación del Aprendiz
                </p>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Foto del Carné</label>{storageUrl(initialData?.imagen_url_carnet_sena) ? <img className="img-thumbnail d-block mb-1" style={{ maxHeight: 80 }} src={storageUrl(initialData.imagen_url_carnet_sena)} alt="Carné SENA" /> : <span className="d-block small text-muted mb-1">Sin imagen cargada</span>}
                    {!readOnly && <input type="file" className="form-control form-control-sm" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAprendizData((current) => ({ ...current, imagenes: { ...current.imagenes, imagen_url_carnet_sena: event.target.files?.[0] } }))} />}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Documento Digital</label>{storageUrl(initialData?.imagen_url_identificacion) ? <img className="img-thumbnail d-block mb-1" style={{ maxHeight: 80 }} src={storageUrl(initialData.imagen_url_identificacion)} alt="Identificación" /> : <span className="d-block small text-muted mb-1">Sin imagen cargada</span>}
                    {!readOnly && <input type="file" className="form-control form-control-sm" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAprendizData((current) => ({ ...current, imagenes: { ...current.imagenes, imagen_url_identificacion: event.target.files?.[0] } }))} />}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Foto Perfil</label>{storageUrl(initialData?.imagen_url_aprendiz) ? <img className="img-thumbnail d-block mb-1" style={{ maxHeight: 80 }} src={storageUrl(initialData.imagen_url_aprendiz)} alt="Aprendiz" /> : <span className="d-block small text-muted mb-1">Sin imagen cargada</span>}
                    {!readOnly && <input type="file" className="form-control form-control-sm" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAprendizData((current) => ({ ...current, imagenes: { ...current.imagenes, imagen_url_aprendiz: event.target.files?.[0] } }))} />}
                  </div>
                </div>
            </div>
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