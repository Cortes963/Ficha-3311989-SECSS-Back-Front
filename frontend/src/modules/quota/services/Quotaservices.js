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

// Detalle de cupo/vehículo de un usuario puntual: ¿tiene vehículo?, ¿está
// habilitado?, ¿está dentro de las instalaciones ahora mismo?
export const obtenerCupoPorUsuario = async (idUsuario) => {
  const { data } = await apiClient.get(`/quota/usuario/${idUsuario}`);
  return data;
};

/**
 * Asigna/registra un cupo para un usuario y vehículo.
 * Campos obligatorios
 * estado, id_usuario_administrador.
 */
export const asignarCupo = ({ id_usuario, id_vehiculo, estado, id_usuario_administrador }) =>
  apiClient.post('/quota', { id_usuario, id_vehiculo, estado, id_usuario_administrador });

// Habilita (estado=1) o deshabilita (estado=0) un cupo ya existente.
export const actualizarEstadoCupo = (idUsuario, idVehiculo, estado) =>
  apiClient.patch(`/quota/${idUsuario}/${idVehiculo}`, { estado });