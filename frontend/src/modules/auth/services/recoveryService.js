import { apiClient } from '@/services/apiClient';

export const requestPasswordReset = (correo) => apiClient.post('/auth/forgot-password', { correo });
export const resetPassword = (token, password) => apiClient.post('/auth/reset-password', { token, password });
