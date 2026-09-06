import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { listarPqrs, obtenerRespuestaDePqrs } from '@/modules/pqrs/services/pqrsService';
import { estadoPqrsInfo, pqrsYaRespondida } from '@/modules/pqrs/utils/estadoPqrs';

const paginaVacia = { content: [], totalPages: 0, number: 0 };

/**
 * "Mis PQRS": lista las PQRS radicadas por el usuario en sesion, con su
 * estado actual, y permite consultar la respuesta cuando ya existe.
 */
export const MisPqrsList = () => {
  const { user } = useAuth();

  const [pagina, setPagina] = useState(0);
  const [pqrsPage, setPqrsPage] = useState(paginaVacia);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [idExpandido, setIdExpandido] = useState(null);
  // Cache por id de pqrs: 'cargando' | 'sin-respuesta' | { asunto, cuerpo, ... }
  const [respuestas, setRespuestas] = useState({});

  const cargar = async () => {
    if (!user?.id) return;
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await listarPqrs({ idUsuario: user.id, pagina, limite: 10 });
      setPqrsPage(data);
    } catch (error) {
      setErrorCarga(error.message || 'No fue posible cargar tus PQRS.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, user?.id]);

  const alternarRespuesta = async (pqrs) => {
    if (idExpandido === pqrs.id) {
      setIdExpandido(null);
      return;
    }
    setIdExpandido(pqrs.id);

    if (!pqrsYaRespondida(pqrs.estado) || respuestas[pqrs.id]) return;

    setRespuestas((prev) => ({ ...prev, [pqrs.id]: 'cargando' }));
    try {
      const respuesta = await obtenerRespuestaDePqrs(pqrs.id);
      setRespuestas((prev) => ({ ...prev, [pqrs.id]: respuesta }));
    } catch {
      setRespuestas((prev) => ({ ...prev, [pqrs.id]: 'sin-respuesta' }));
    }
  };

  const formatearFecha = (fechaHora) => (fechaHora ? fechaHora.substring(0, 16).replace('T', ' ') : '—');

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white p-3 d-flex justify-content-between align-items-center">
        <h4 className="m-0 fw-bold"><i className="bi bi-clock-history me-2"></i>Mis PQRS</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={cargar}>
          <i className="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>
      <div className="card-body p-0">
        {errorCarga && <div className="alert alert-danger m-3">{errorCarga}</div>}

        {cargando ? (
          <div className="text-center py-4 text-muted">Cargando tus PQRS…</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Asunto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th className="text-end pe-3">Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {pqrsPage.content.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-muted">Aún no has radicado ninguna PQRS.</td>
                  </tr>
                )}
                {pqrsPage.content.map((pqrs) => {
                  const estadoInfo = estadoPqrsInfo(pqrs.estado);
                  const respuesta = respuestas[pqrs.id];
                  const expandida = idExpandido === pqrs.id;

                  return (
                    <Fragment key={pqrs.id}>
                      <tr>
                        <td className="ps-3">{pqrs.asunto}</td>
                        <td><span className={`badge bg-${estadoInfo.clase}`}>{estadoInfo.label}</span></td>
                        <td>{formatearFecha(pqrs.fechaHora)}</td>
                        <td className="text-end pe-3">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => alternarRespuesta(pqrs)}>
                            {expandida ? 'Ocultar' : 'Ver detalle'}
                          </button>
                        </td>
                      </tr>
                      {expandida && (
                        <tr>
                          <td colSpan={4} className="bg-light">
                            <div className="p-3">
                              <p className="mb-2"><span className="fw-bold">Descripción enviada:</span> {pqrs.cuerpo}</p>
                              {!pqrsYaRespondida(pqrs.estado) && (
                                <p className="text-muted mb-0">Tu PQRS aún no ha sido respondida.</p>
                              )}
                              {pqrsYaRespondida(pqrs.estado) && respuesta === 'cargando' && (
                                <p className="text-muted mb-0">Cargando respuesta…</p>
                              )}
                              {pqrsYaRespondida(pqrs.estado) && respuesta === 'sin-respuesta' && (
                                <p className="text-muted mb-0">No fue posible cargar la respuesta.</p>
                              )}
                              {pqrsYaRespondida(pqrs.estado) && respuesta && respuesta !== 'cargando' && respuesta !== 'sin-respuesta' && (
                                <div className="border-start border-4 border-success ps-3">
                                  <p className="fw-bold mb-1">{respuesta.asunto}</p>
                                  <p className="mb-0">{respuesta.cuerpo}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
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
              className="btn btn-sm btn-outline-secondary"
              disabled={pqrsPage.number === 0}
              onClick={() => setPagina((p) => Math.max(p - 1, 0))}
            >
              Anterior
            </button>
            <span className="small text-muted">Página {pqrsPage.number + 1} de {pqrsPage.totalPages}</span>
            <button
              className="btn btn-sm btn-outline-secondary"
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
