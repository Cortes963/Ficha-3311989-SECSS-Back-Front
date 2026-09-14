import { apiClient } from '@/services/apiClient';

/**
 * Operaciones del módulo Quota (cupos) contra el backend Express.
 *
 * NOTA: al igual que el resto de módulos (auth, user, pqrs, ...), este backend
 * responde con el sobre { ok: true|false, mensaje, ... } — en listados el
 * arreglo va en `datos` (junto a `pagina`, `limite`, `total`); apiClient ya
 * normaliza el camino de error, así que en éxito el body se lee tal cual.
 */

// Lista todos los cupos (tabla auth_vehiculo completa, sin filtros por ahora).
export const listarCupos = async () => {
  const { datos } = await apiClient.get('/quota');
  return datos;
};

// Detalle de cupo/vehículo de un usuario puntual: ¿tiene vehículo?, ¿está
// habilitado?, ¿está dentro de las instalaciones ahora mismo?
export const obtenerCupoPorUsuario = async (idUsuario) => {
  const { vehiculo, vehiculoEnParqueadero, idEntradaAbierta } = await apiClient.get(`/quota/usuario/${idUsuario}`);
  return { vehiculo, vehiculoEnParqueadero, idEntradaAbierta };
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