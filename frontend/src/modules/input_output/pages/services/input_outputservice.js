import { apiClient } from '@/services/apiClient';

/**
 * NOTA: este módulo responde con el sobre { status: 'success'|'error', data, message },
 * igual que quota (ver apiClient.js). En éxito se lee `.data`.
 */

// Lista todos los registros de entrada/salida (orden: ingreso más reciente primero).
export const listarRegistros = async () => {
  const { data } = await apiClient.get('/input_output');
  return data;
};

/**
 * Registra el INGRESO de un usuario con su vehículo.
 * Campos obligatorios: id_usuario_entra, id_vehiculo, id_usuario_celador_ingreso.
 * El backend rechaza (409) si ya existe un ingreso abierto (sin salida) para
 * el mismo usuario y vehículo.
 */
export const registrarEntrada = ({ id_usuario_entra, id_vehiculo, id_usuario_celador_ingreso }) =>
  apiClient.post('/input_output/entrada', {
    id_usuario_entra,
    id_vehiculo,
    id_usuario_celador_ingreso,
  });

/**
 * Registra la SALIDA de un ingreso ya existente, identificado por el id
 * del renglón de entrada_salida (no por usuario/vehículo).
 */
export const registrarSalida = (id, { id_usuario_celador_salida }) =>
  apiClient.patch(`/input_output/salida/${id}`, { id_usuario_celador_salida });
