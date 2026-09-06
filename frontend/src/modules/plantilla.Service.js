// src/modules/<modulo>/services/NOMBREService.js
import { apiClient } from '@/services/apiClient';

export const listarNOMBRE = async () => {
  const { data } = await apiClient.get('/nombre-recurso');
  return data;
};

export const obtenerNOMBREPorId = async (id) => {
  const { data } = await apiClient.get(`/nombre-recurso/${id}`);
  return data;
};

export const crearNOMBRE = (payload) => apiClient.post('/nombre-recurso', payload);

export const actualizarNOMBRE = (id, payload) => apiClient.patch(`/nombre-recurso/${id}`, payload);

// "Eliminar" = inactivar, nunca DELETE
export const inactivarNOMBRE = (id) => apiClient.patch(`/nombre-recurso/${id}`, { estado: 0 });