import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { listarPqrs, responderPqrs } from '@/modules/pqrs/services/pqrsService';
import { estadoPqrsInfo, pqrsYaRespondida } from '@/modules/pqrs/utils/estadoPqrs';

const paginaVacia = { content: [], totalPages: 0, number: 0 };

/**
 * Vista de administrador: lista TODAS las PQRS (paginadas) y permite
 * responder cada una que aun no tenga respuesta. Al responder, el
 * backend marca automaticamente la PQRS como RESUELTO.
 */
export const PqrsAdminList = () => {
  const { user } = useAuth();

  const [pagina, setPagina] = useState(0);
  const [pqrsPage, setPqrsPage] = useState(paginaVacia);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [idEnRespuesta, setIdEnRespuesta] = useState(null);
  const [formRespuesta, setFormRespuesta] = useState({ asunto: '', cuerpo: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await listarPqrs({ pagina, limite: 10 });
      setPqrsPage(data);
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

  const abrirRespuesta = (pqrs) => {
    setIdEnRespuesta(pqrs.id);
    setFormRespuesta({ asunto: `Re: ${pqrs.asunto}`, cuerpo: '' });
    setMensaje(null);
  };

  const cancelarRespuesta = () => {
    setIdEnRespuesta(null);
    setFormRespuesta({ asunto: '', cuerpo: '' });
  };

  const enviarRespuesta = async (event, idPqrs) => {
    event.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      await responderPqrs(idPqrs, {
        idUsuarioAdministrador: user.id,
        asunto: formRespuesta.asunto.trim(),
        cuerpo: formRespuesta.cuerpo.trim(),
      });
      setIdEnRespuesta(null);
      setFormRespuesta({ asunto: '', cuerpo: '' });
      await cargar();
    } catch (error) {
      setMensaje({ tipo: 'danger', texto: error.message || 'No fue posible registrar la respuesta.' });
    } finally {
      setEnviando(false);
    }
  };

  const formatearFecha = (fechaHora) => (fechaHora ? fechaHora.substring(0, 16).replace('T', ' ') : '—');
  const nombreSolicitante = (pqrs) =>
    pqrs.usuario ? `${pqrs.usuario.primerNombre} ${pqrs.usuario.primerApellido}`.trim() : `Usuario #${pqrs.idUsuario}`;

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white p-3 d-flex justify-content-between align-items-center">
        <h4 className="m-0 fw-bold"><i className="bi bi-info-circle me-2"></i>Gestión de PQRS</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={cargar}>
          <i className="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>
      <div className="card-body p-0">
        {errorCarga && <div className="alert alert-danger m-3">{errorCarga}</div>}

        {cargando ? (
          <div className="text-center py-4 text-muted">Cargando PQRS…</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">ID</th>
                  <th>Solicitante</th>
                  <th>Asunto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th className="text-end pe-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pqrsPage.content.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">No hay PQRS registradas.</td>
                  </tr>
                )}
                {pqrsPage.content.map((pqrs) => {
                  const estadoInfo = estadoPqrsInfo(pqrs.estado);
                  const yaRespondida = pqrsYaRespondida(pqrs.estado);
                  const estaAbierta = idEnRespuesta === pqrs.id;

                  return (
                    <Fragment key={pqrs.id}>
                      <tr>
                        <td className="ps-3">{pqrs.id}</td>
                        <td>{nombreSolicitante(pqrs)}</td>
                        <td>{pqrs.asunto}</td>
                        <td><span className={`badge bg-${estadoInfo.clase}`}>{estadoInfo.label}</span></td>
                        <td>{formatearFecha(pqrs.fechaHora)}</td>
                        <td className="text-end pe-3">
                          {yaRespondida ? (
                            <span className="text-muted small">Ya respondida</span>
                          ) : (
                            <button
                              className="btn btn-sm btn-sena"
                              onClick={() => (estaAbierta ? cancelarRespuesta() : abrirRespuesta(pqrs))}
                            >
                              <i className="bi bi-reply-fill"></i> {estaAbierta ? 'Cerrar' : 'Responder'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {estaAbierta && (
                        <tr>
                          <td colSpan={6} className="bg-light">
                            <form onSubmit={(event) => enviarRespuesta(event, pqrs.id)} className="p-3">
                              <div className="mb-2">
                                <label className="form-label small fw-bold" htmlFor={`asunto-${pqrs.id}`}>
                                  Asunto de la respuesta
                                </label>
                                <input
                                  id={`asunto-${pqrs.id}`}
                                  className="form-control form-control-sm"
                                  value={formRespuesta.asunto}
                                  onChange={(e) => setFormRespuesta((f) => ({ ...f, asunto: e.target.value }))}
                                  required
                                />
                              </div>
                              <div className="mb-2">
                                <label className="form-label small fw-bold" htmlFor={`cuerpo-${pqrs.id}`}>
                                  Respuesta
                                </label>
                                <textarea
                                  id={`cuerpo-${pqrs.id}`}
                                  className="form-control form-control-sm"
                                  rows="3"
                                  value={formRespuesta.cuerpo}
                                  onChange={(e) => setFormRespuesta((f) => ({ ...f, cuerpo: e.target.value }))}
                                  required
                                />
                              </div>
                              {mensaje && (
                                <div className={`alert alert-${mensaje.tipo} py-2`} role="alert">{mensaje.texto}</div>
                              )}
                              <button type="button" className="btn btn-sm btn-outline-secondary me-2" onClick={cancelarRespuesta}>
                                Cancelar
                              </button>
                              <button type="submit" className="btn btn-sm btn-sena" disabled={enviando}>
                                {enviando ? 'Enviando…' : 'Enviar respuesta'}
                              </button>
                            </form>
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
