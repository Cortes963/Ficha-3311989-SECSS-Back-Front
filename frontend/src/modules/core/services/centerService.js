import { apiClient } from '@/services/apiClient';

export const listarCentros = async () => (await apiClient.get('/core/centros')).datos;
export const listarCentrosPublicos = async () => (await apiClient.get('/core/centros-publicos')).datos;
export const crearCentro = (nombre_centro) => apiClient.post('/core/centros', { nombre_centro });
export const editarCentro = (id, nombre_centro) => apiClient.patch(`/core/centros/${id}`, { nombre_centro });
