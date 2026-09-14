// src/modules/user/services/userService.js
import { apiClient } from '@/services/apiClient';

export const getUsuarios = async (rol) => {
  const { datos } = await apiClient.get(rol ? `/users?rol=${rol}` : '/users');
  return datos;
};

export const getUsuarioPorId = async (id) => {
  const { datos } = await apiClient.get(`/users/${id}`);
  return datos;
};
