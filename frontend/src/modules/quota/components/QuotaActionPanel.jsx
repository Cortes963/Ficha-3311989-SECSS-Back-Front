// src/modules/quota/components/QuotaActionPanel.jsx
import React from 'react';

export const QuotaActionPanel = ({ rolUsuario, estadoCupo, vehiculoDentro, onAction }) => {
  const isAdmin = rolUsuario === 'ADMINISTRADOR';
  const isCelador = rolUsuario === 'CELADOR' || rolUsuario === 'JEFE_SEGURIDAD';

  return (
    <div className="d-flex flex-column gap-3 animate__animated animate__fadeIn">
      
      {/* PANEL DE ADMINISTRADOR: Habilitar o Deshabilitar el cupo */}
      {isAdmin && (
        <div className="p-3 border border-secondary border-opacity-25 rounded bg-white shadow-sm">
          <h6 className="fw-bold text-dark mb-3">
            <i className="bi bi-shield-lock me-2 text-secondary"></i>Gestión de Permisos (Admin)
          </h6>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-success flex-grow-1 fw-bold"
              disabled={estadoCupo === 'Activo'}
              onClick={() => onAction('HABILITAR')}
            >
              <i className="bi bi-check-circle me-2"></i>Aprobar Cupo
            </button>
            <button 
              className="btn btn-danger flex-grow-1 fw-bold"
              disabled={estadoCupo === 'Inactivo'}
              onClick={() => onAction('DESHABILITAR')}
            >
              <i className="bi bi-x-circle me-2"></i>Revocar Cupo
            </button>
          </div>
        </div>
      )}

      {/* PANEL DE CELADOR: Control de Tráfico */}
      {isCelador && (
        <div className="p-3 border border-primary border-opacity-25 rounded bg-white shadow-sm">
          <h6 className="fw-bold text-dark mb-3">
            <i className="bi bi-cone-striped me-2 text-primary"></i>Control de Acceso Físico (Guarda)
          </h6>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-primary flex-grow-1 fw-bold"
              disabled={vehiculoDentro || estadoCupo !== 'Activo'}
              onClick={() => onAction('INGRESO')}
            >
              <i className="bi bi-box-arrow-in-right me-2"></i>Registrar Ingreso
            </button>
            <button 
              className="btn btn-warning flex-grow-1 fw-bold text-dark"
              disabled={!vehiculoDentro || estadoCupo !== 'Activo'}
              onClick={() => onAction('SALIDA')}
            >
              <i className="bi bi-box-arrow-left me-2"></i>Registrar Salida
            </button>
          </div>
          {estadoCupo !== 'Activo' && (
            <div className="mt-2 text-danger small fw-bold text-center">
              <i className="bi bi-exclamation-triangle me-1"></i> Operaciones bloqueadas: Cupo Inactivo.
            </div>
          )}
        </div>
      )}

    </div>
  );
};