import { apiClient } from '@/services/apiClient';

// Lista todos los registros de entrada/salida (orden: ingreso más reciente primero).
export const obtenerRegistros = async () => {
  const response = await apiClient.get('/input_output');
  return response.datos ?? response.data ?? response;
};

/**
 * Registra el INGRESO de un usuario con su vehículo.
 * Campos obligatorios: id_usuario_entra, id_vehiculo, id_usuario_celador_ingreso.
 * El backend rechaza (409) si ya existe un ingreso abierto (sin salida) para
 * el mismo usuario y vehículo.
 */
export const registrarEntrada = ({ id_usuario_entra, id_vehiculo }) =>
  apiClient.post('/input_output/entrada', { id_usuario_entra, id_vehiculo });

/**
 * Registra la SALIDA de un ingreso ya existente, identificado por el id
 * del renglón de entrada_salida (no por usuario/vehículo).
 */
export const registrarSalida = (id) => apiClient.patch(`/input_output/salida/${id}`, {});

export const obtenerEntradaSalida = async (id) => {
  const response = await apiClient.get(`/input_output/${id}`);
  return response.datos || response.data || response;
};
