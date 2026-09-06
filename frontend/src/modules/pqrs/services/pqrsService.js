import { apiClient } from '@/services/apiClient';

/** Radica una nueva PQRS. Devuelve la entidad Pqrs creada (incluye su `id`). */
export const radicarPqrs = ({ idUsuario, asunto, cuerpo }) =>
  apiClient.post('/pqrs', { idUsuario, asunto, cuerpo });


export const listarPqrs = ({ estado, idUsuario, pagina = 0, limite = 20 } = {}) => {
  const parametros = new URLSearchParams({ pagina, limite });
  if (estado !== undefined) parametros.set('estado', estado);
  if (idUsuario !== undefined) parametros.set('idUsuario', idUsuario);
  return apiClient.get(`/pqrs?${parametros}`);
};

/** Detalle de una PQRS puntual. */
export const obtenerPqrs = (id) => apiClient.get(`/pqrs/${id}`);

/** Actualiza asunto/cuerpo (y opcionalmente el usuario) de una PQRS existente. */
export const actualizarPqrs = (id, { idUsuario, asunto, cuerpo }) =>
  apiClient.put(`/pqrs/${id}`, { idUsuario, asunto, cuerpo });

/** Cambia solo el estado (1=RADICADO, 2=EN_TRAMITE, 3=RESUELTO, 4=CERRADO). */
export const actualizarEstadoPqrs = (id, estado) =>
  apiClient.patch(`/pqrs/${id}/estado`, { estado });

/** Elimina una PQRS. */
export const eliminarPqrs = (id) => apiClient.delete(`/pqrs/${id}`);

/** Respuesta (1 a 1) de una PQRS puntual, si ya existe. */
export const obtenerRespuestaDePqrs = (idPqrs) =>
  apiClient.get(`/pqrs/${idPqrs}/respuesta`);

/** Registra la respuesta de un administrador a una PQRS; la marca como RESUELTO. */
export const responderPqrs = (idPqrs, { idUsuarioAdministrador, asunto, cuerpo }) =>
  apiClient.post(`/pqrs/${idPqrs}/respuesta`, { idUsuarioAdministrador, asunto, cuerpo });

/** Actualiza una respuesta ya registrada. */
export const actualizarRespuesta = (idRespuesta, { idUsuarioAdministrador, asunto, cuerpo }) =>
  apiClient.put(`/respuestas/${idRespuesta}`, { idUsuarioAdministrador, asunto, cuerpo });

/** Elimina una respuesta (la PQRS vuelve a estado EN_TRAMITE). */
export const eliminarRespuesta = (idRespuesta) =>
  apiClient.delete(`/respuestas/${idRespuesta}`);
