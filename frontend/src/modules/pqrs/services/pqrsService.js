import { apiClient } from '@/services/apiClient';

/**
 * Operaciones del módulo PQRS contra el backend Express.
 * La API espera exactamente: id_usuario, asunto y cuerpo.
 */
export const radicarPqrs = ({ id_usuario, asunto, cuerpo }) =>
  apiClient.post('/pqrs', { id_usuario, asunto, cuerpo });

export const listarPqrs = ({ estado, id_usuario, pagina = 1, limite = 20 } = {}) => {
  const parametros = new URLSearchParams({ pagina, limite });
  if (estado !== undefined) parametros.set('estado', estado);
  if (id_usuario !== undefined) parametros.set('id_usuario', id_usuario);
  return apiClient.get(`/pqrs?${parametros}`);
};

export const obtenerPqrs = (id) => apiClient.get(`/pqrs/${id}`);

export const actualizarEstadoPqrs = (id, estado) =>
  apiClient.patch(`/pqrs/${id}/estado`, { estado });
