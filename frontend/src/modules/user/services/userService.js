// src/modules/user/services/userService.js
import { apiClient } from '@/services/apiClient';

export const getUsuarios = async (rol) => {
  const { data } = await apiClient.get(rol ? `/user?rol=${rol}` : '/user');
  return data;
};

export const getUsuarioPorId = async (id) => {
  const { data } = await apiClient.get(`/user/${id}`);
  return data;
};

export const crearUsuario = (usuario) => apiClient.post('/user', usuario);
