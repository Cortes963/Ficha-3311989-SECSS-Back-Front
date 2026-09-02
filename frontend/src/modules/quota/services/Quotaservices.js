import { apiClient } from '@/services/apiClient';

/**
 * Operaciones del módulo Quota (cupos) contra el backend Express.
 *
 * NOTA: este módulo responde con el sobre { status: 'success'|'error', data, message },
 * no con { ok, mensaje } (ver comentario en apiClient.js). apiClient ya normaliza
 * el camino de error; en éxito el body se devuelve tal cual, por eso aquí se lee `.data`.
 */

// Lista todos los cupos (tabla auth_vehiculo completa, sin filtros por ahora).
export const listarCupos = async () => {
  const { data } = await apiClient.get('/quota');
  return data;
};

/**
 * Asigna/registra un cupo para un usuario y vehículo.
 * Campos obligatorios
 * estado, id_usuario_administrador.
 */
export const asignarCupo = ({ id_usuario, id_vehiculo, estado, id_usuario_administrador }) =>
  apiClient.post('/quota', { id_usuario, id_vehiculo, estado, id_usuario_administrador });