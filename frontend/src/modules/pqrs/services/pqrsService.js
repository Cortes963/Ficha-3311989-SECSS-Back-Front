import { apiClient } from '@/services/apiClient';

/**
 * Operaciones del módulo PQRS contra el backend Express real (Backend/routes/attention.routes.js).
 *
 * El backend habla en snake_case y pagina desde 1, con el sobre
 * { ok, mensaje, pagina, limite, total, datos }. Los componentes de este
 * módulo (MisPqrsList, PqrsAdminList) fueron escritos asumiendo un backend
 * distinto (paginación estilo Spring: { content, totalPages, number } y
 * pagina desde 0) que nunca existió en este proyecto. Para no reescribir
 * esos componentes, este servicio hace de puente: llama al backend real y
 * normaliza la respuesta a la forma que ellos ya esperan.
 */

const mapPqrs = (p) => ({
  id: p.id,
  idUsuario: p.id_usuario,
  asunto: p.asunto,
  cuerpo: p.cuerpo,
  anexos: p.anexos || p.archivos || [],
  estado: p.estado,
  fechaHora: p.fecha_creacion,
  tieneRespuesta: !!p.tiene_respuesta,
  respuesta: p.respuesta_id ? {
    id: p.respuesta_id,
    asunto: p.respuesta_asunto,
    cuerpo: p.respuesta_cuerpo,
    fechaHora: p.respuesta_fecha,
    idUsuarioAdministrador: p.respuesta_id_usuario,
    respondiente: p.respuesta_respondiente,
  } : null,
  usuario: p.primer_nombre
    ? { primerNombre: p.primer_nombre, primerApellido: p.primer_apellido }
    : null,
});

const mapRespuesta = (r) => ({
  id: r.id,
  idPqrs: r.id_pqrs,
  idUsuarioAdministrador: r.id_usuario_administrador,
  asunto: r.asunto,
  cuerpo: r.cuerpo,
  fechaHora: r.fecha_creacion,
});

/** Radica una nueva PQRS. Devuelve { mensaje, id_pqrs }. */
export const radicarPqrs = ({ asunto, cuerpo }) =>
  apiClient.post('/pqrs', { asunto, cuerpo });

/**
 * Lista PQRS paginadas. `pagina` sigue base 0 (como espera la UI) y se
 * traduce a la paginación base 1 del backend. El backend, además, ya filtra
 * automáticamente por el usuario en sesión cuando no es ADMINISTRADOR
 * (ver indexPqrs), así que `idUsuario` es informativo únicamente.
 */
export const listarPqrs = async ({ estado, idUsuario, pagina = 0, limite = 20 } = {}) => {
  const parametros = new URLSearchParams({ pagina: pagina + 1, limite });
  if (estado !== undefined) parametros.set('estado', estado);
  if (idUsuario !== undefined) parametros.set('idUsuario', idUsuario);

  const respuesta = await apiClient.get(`/pqrs?${parametros}`);
  const datos = respuesta.datos || [];
  const limiteReal = respuesta.limite || limite;
  const total = respuesta.total || 0;

  return {
    content: datos.map(mapPqrs),
    totalPages: limiteReal ? Math.ceil(total / limiteReal) : 0,
    number: (respuesta.pagina || pagina + 1) - 1,
    total,
  };
};

/** Detalle de una PQRS puntual. */
export const obtenerPqrs = async (id) => {
  const { datos } = await apiClient.get(`/pqrs/${id}`);
  return mapPqrs(datos);
};

/** Actualiza asunto/cuerpo de una PQRS existente (solo mientras esté RADICADO). */
export const actualizarPqrs = (id, { asunto, cuerpo }) =>
  apiClient.put(`/pqrs/${id}`, { asunto, cuerpo });

/** Cambia solo el estado (1=RADICADO, 2=EN_TRAMITE, 3=RESUELTO, 4=CERRADO). */
export const actualizarEstadoPqrs = (id, estado) =>
  apiClient.patch(`/pqrs/${id}/estado`, { estado });

/** Elimina una PQRS (solo mientras no tenga respuesta). */
export const eliminarPqrs = (id) => apiClient.delete(`/pqrs/${id}`);

/** Respuesta (1 a 1) de una PQRS puntual, si ya existe. */
export const obtenerRespuestaDePqrs = async (idPqrs) => {
  const { datos } = await apiClient.get(`/pqrs/${idPqrs}/respuesta`);
  return mapRespuesta(datos);
};

/** Registra la respuesta de un administrador a una PQRS; la marca como RESUELTO. */
export const responderPqrs = (idPqrs, { asunto, cuerpo }) =>
  apiClient.post(`/pqrs/${idPqrs}/respuesta`, { asunto, cuerpo });

/** Actualiza una respuesta ya registrada. */
export const actualizarRespuesta = (idRespuesta, { asunto, cuerpo }) =>
  apiClient.put(`/respuestas/${idRespuesta}`, { asunto, cuerpo });

/** Elimina una respuesta (la PQRS vuelve a estado EN_TRAMITE). */
export const eliminarRespuesta = (idRespuesta) =>
  apiClient.delete(`/respuestas/${idRespuesta}`);
