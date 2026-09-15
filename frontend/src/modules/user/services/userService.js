// src/modules/user/services/userService.js
import { apiClient } from '@/services/apiClient';

export const getUsuarios = async (rol) => {
  const { datos } = await apiClient.get(rol ? `/users?rol=${rol}` : '/users');
  return datos;
};
export const buscarUsuariosElegibles = async (query, rol) => {
  const params = new URLSearchParams({ q: query || '' });
  if (rol) params.set('rol', rol);
  const { datos } = await apiClient.get(`/users/elegibles?${params}`);
  return datos;
};

export const getUsuarioPorId = async (id) => {
  const { datos } = await apiClient.get(`/users/${id}`);
  return datos;
};

export const getMiPerfil = async () => (await apiClient.get('/users/me')).datos;
export const updateMyPassword = (password_actual, password_nueva) =>
  apiClient.patch('/users/me/password', { password_actual, password_nueva });
export const updateMyProfile = (payload) => apiClient.patch('/users/me', payload);
export const deactivateMyAccount = () => apiClient.patch('/users/me/estado', { estado: 0 });
export const crearCelador = (payload) => apiClient.post('/users/celador', payload);
export const actualizarEstadoUsuario = (id, estado) => apiClient.patch(`/users/${id}/estado`, { estado });
