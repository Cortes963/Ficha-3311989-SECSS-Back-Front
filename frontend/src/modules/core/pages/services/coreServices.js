// src/modules/core/services/coreService.js
import { apiClient } from '@/services/apiClient';

// GET /api/core/centros es público (no requiere token): lo necesita tanto
// RegisterPage (usuario aún sin sesión) como ApprenForm en modo edición.
export const getCentros = async () => {
  const { datos } = await apiClient.get('/core/centros');
  return datos;
};
