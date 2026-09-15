import { apiClient } from '@/services/apiClient';

export const listarCentros = async () => (await apiClient.get('/core/centros')).datos;
export const crearCentro = () => Promise.reject(new Error('El backend no expone aún el contrato de registro de centros.'));
export const editarCentro = () => Promise.reject(new Error('El backend no expone aún el contrato de edición de centros.'));
