// src/modules/reports/components/ReportForm.jsx
import { useState } from 'react';

export const ReportForm = () => {
  const [reportData, setReportData] = useState({
    tipo: 'NOVEDAD_VEHICULO',
    asunto: '',
    descripcion: '',
    prioridad: 'MEDIA'
  });

  return (
    <div className="card shadow-sm border-0 border-top border-danger border-4">
      <div className="card-header bg-white p-3 border-bottom-0">
        <h4 className="text-danger m-0 fw-bold">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>Generación de Reporte / PQRS
        </h4>
      </div>
      <div className="card-body p-4">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-bold small">Clasificación del Reporte</label>
              <select className="form-select" value={reportData.tipo} onChange={(e) => setReportData({...reportData, tipo: e.target.value})}>
                <optgroup label="Seguridad y Control">
                  <option value="NOVEDAD_VEHICULO">Novedad con Vehículo / Cupo</option>
                  <option value="INCIDENTE_ACCESO">Incidente en Control de Acceso</option>
                </optgroup>
                <optgroup label="Administrativo (PQRS)">
                  <option value="PETICION">Petición</option>
                  <option value="QUEJA">Queja</option>
                  <option value="RECLAMO">Reclamo</option>
                </optgroup>
              </select>
            </div>
            
            <div className="col-md-6">
              <label className="form-label fw-bold small">Nivel de Prioridad</label>
              <select className="form-select" value={reportData.prioridad} onChange={(e) => setReportData({...reportData, prioridad: e.target.value})}>
                <option value="ALTA">🔴 Alta (Requiere atención inmediata)</option>
                <option value="MEDIA">🟡 Media (Revisión estándar)</option>
                <option value="BAJA">🟢 Baja (Informativo)</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label fw-bold small">Asunto Breve</label>
              <input type="text" className="form-control" placeholder="Ej: Daño en talanquera, Vehículo bloqueando salida..." required />
            </div>

            <div className="col-12">
              <label className="form-label fw-bold small">Descripción Detallada de los Hechos</label>
              <textarea className="form-control" rows="5" placeholder="Describa el incidente con fechas, horas y personas involucradas si las hay..." required></textarea>
            </div>

            <div className="col-12">
              <label className="form-label fw-bold small">Evidencia Adjunta (Opcional)</label>
              <input type="file" className="form-control" accept="image/*,.pdf" multiple />
              <div className="form-text">Puede adjuntar fotografías o documentos (Max 5MB).</div>
            </div>

            <div className="col-12 text-end mt-4">
              <button className="btn btn-light me-2">Cancelar</button>
              <button type="submit" className="btn btn-danger px-4 fw-bold">Radicar Reporte</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};