/* eslint-disable react-hooks/set-state-in-effect */
import { Fragment, useEffect, useState } from 'react';
import { listarPqrs } from '@/modules/pqrs/services/pqrsService';
import { estadoPqrsInfo } from '@/modules/pqrs/utils/estadoPQRS';
import { Link } from 'react-router-dom';

const paginaVacia = { content: [], totalPages: 0, number: 0 };

const CINCO_MINUTOS_MS = 5 * 60 * 1000;

/**
 * Vista de administrador: lista TODAS las PQRS (paginadas) y permite
 * responder cada una que aun no tenga respuesta. Al responder, el
 * backend marca automaticamente la PQRS como RESUELTO.
 */
export const PqrsAdminList = () => {

  const [pagina, setPagina] = useState(0);
  const [pqrsPage, setPqrsPage] = useState(paginaVacia);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await listarPqrs({ pagina, limite: 10 });
      setPqrsPage(data);
      setAhora(Date.now());
    } catch (error) {
      setErrorCarga(error.message || 'No fue posible cargar las PQRS.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  const nombreSolicitante = (pqrs) =>
    pqrs.usuario ? `${pqrs.usuario.primerNombre} ${pqrs.usuario.primerApellido}`.trim() : `Usuario #${pqrs.idUsuario}`;

  const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

  // Una PQRS puede editarse la respuesta solo dentro de los 5 minutos
  // siguientes a haberla registrado (misma regla que en PqrsDetailPage).
  const puedeEditarRespuesta = (pqrs) =>
    Boolean(pqrs.respuesta) && ahora - new Date(pqrs.respuesta.fechaHora).getTime() <= CINCO_MINUTOS_MS;

  return (
    <div className="card shadow-sm border-0 rounded-3 overflow-hidden border-top border-3 border-success">
      <div className="card-body p-0">
        <div className="p-3 d-flex justify-content-between align-items-center">
          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={cargar}>
            <i className="bi bi-arrow-clockwise me-1"></i> Actualizar
          </button>
        </div>

        <div className="px-3 pb-3">
          <div className="input-group rounded-pill overflow-hidden bg-light">
            <span className="input-group-text bg-light border-0 ps-3">
              <i className="bi bi-search text-secondary"></i>
            </span>
            <input
              type="text"
              className="form-control bg-light border-0 py-2 text-secondary"
              placeholder="Buscar..."
            />
          </div>
        </div>

        {errorCarga && <div className="alert alert-danger m-3">{errorCarga}</div>}

        {cargando ? (
          <div className="text-center py-5 text-muted">Cargando PQRS…</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr className="border-bottom">
                  <th className="ps-4 py-3 text-secondary fw-semibold">ID</th>
                  <th className="py-3 text-secondary fw-semibold">Solicitante</th>
                  <th className="py-3 text-secondary fw-semibold">Asunto</th>
                  <th className="py-3 text-secondary fw-semibold">Estado</th>
                  <th className="py-3 text-secondary fw-semibold">Fecha</th>
                  <th className="py-3 text-secondary fw-semibold">Respuesta</th>
                  <th className="text-end pe-4 py-3 text-secondary fw-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pqrsPage.content.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">No hay PQRS registradas.</td>
                  </tr>
                )}
                {pqrsPage.content.map((pqrs) => {
                  const estadoInfo = estadoPqrsInfo(pqrs.estado);
                  const sinRespuesta = !pqrs.respuesta;
                  const editable = puedeEditarRespuesta(pqrs);

                  return (
                    <Fragment key={pqrs.id}>
                      <tr className="border-bottom">
                        <td className="ps-4 py-3 fw-normal text-dark">#{pqrs.id}</td>
                        <td className="py-3">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-person-circle text-secondary fs-5"></i>
                            <span className="fw-medium text-dark">{nombreSolicitante(pqrs)}</span>
                          </div>
                        </td>
                        <td className="py-3 text-dark">{pqrs.asunto}</td>
                        <td className="py-3">
                          <span className={`badge rounded-pill bg-${estadoInfo.clase}-subtle text-${estadoInfo.clase} px-3 py-2 fw-medium d-inline-flex align-items-center gap-1`}>
                            <span>•</span> {estadoInfo.label}
                          </span>
                        </td>
                        <td className="py-3 text-secondary">{formatDate(pqrs.fechaHora)}</td>
                        <td className="py-3 text-secondary">{formatDate(pqrs.respuesta?.fechaHora || '—')}</td>
                        <td className="py-3">
                          {pqrs.respuesta ? (
                            <div>
                              <div className="text-dark">{pqrs.respuesta.cuerpo}</div>
                              <small className="text-muted">
                                {formatDate(pqrs.respuesta.fechaHora) || '—'} · {pqrs.respuesta.respondiente || pqrs.respuesta.idUsuarioAdministrador || '—'}
                              </small>
                            </div>
                          ) : (
                            <span className="text-muted fst-italic">Sin respuesta</span>
                          )}
                        </td>
                        <td className="text-end pe-4 py-3">
                          <div className="d-flex justify-content-end gap-2">
                            <Link className="btn btn-sm btn-primary rounded-3 px-3" to={`/pqrs/${pqrs.id}`}>
                              Consultar
                            </Link>
                            {sinRespuesta && (
                              <Link className="btn btn-sm btn-success rounded-3 px-3" to={`/pqrs/${pqrs.id}`}>
                                Responder
                              </Link>
                            )}
                            {editable && (
                              <Link className="btn btn-sm btn-outline-secondary rounded-3 px-3" to={`/pqrs/${pqrs.id}`}>
                                Editar
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pqrsPage.totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <button
              className="btn btn-sm btn-outline-secondary rounded-pill px-3"
              disabled={pqrsPage.number === 0}
              onClick={() => setPagina((p) => Math.max(p - 1, 0))}
            >
              Anterior
            </button>
            <span className="small text-muted">Página {pqrsPage.number + 1} de {pqrsPage.totalPages}</span>
            <button
              className="btn btn-sm btn-outline-secondary rounded-pill px-3"
              disabled={pqrsPage.number >= pqrsPage.totalPages - 1}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
