// src/modules/auth/services/authService.js
import { apiClient } from '@/services/apiClient';

/**
 * Inicia sesión contra POST /api/auth/login.
 *
 * NOTA: el backend hoy solo busca por `cuenta.nombre_usuario` o `cuenta.correo`
 * (ver Backend/controller/auth/auth.controller.js). El formulario de login de
 * SECSS pide número de documento, así que aquí se manda como `nombre_usuario` —
 * necesita que el backend también compare contra `usuario.numero_documento`
 * para que esto funcione con datos reales (cambio de una línea, señalado aparte).
 */
export const login = (identificador, password) =>
  apiClient.post('/auth/login', { nombre_usuario: identificador, password });
