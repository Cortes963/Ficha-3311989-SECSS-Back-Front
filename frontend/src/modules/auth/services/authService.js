// src/modules/auth/services/authService.js
import { apiClient } from '@/services/apiClient';
import { appendFiles } from '@/utils/media';

/**
 * Inicia sesión contra POST /api/auth/storeAuthLogin.
 *
 * La API (api/controller/auth.controller.js) ya busca por
 * `usuario.numero_documento`, que es justo lo que pide el formulario de
 * SECSS, así que se manda tal cual bajo ese nombre. La respuesta trae
 * { ok, token, usuario }; el token se guarda en apiClient (setToken) desde
 * AuthContext, ya que todas las rutas fuera de /auth exigen Bearer token.
 */
export const login = (documento, password) =>
  apiClient.post('/auth/storeAuthLogin', { numero_documento: documento, password });

/**
 * Registra un usuario nuevo contra POST /api/auth/storeAuthRegister (pública,
 * no requiere token — está montada antes del middleware requireAuth en
 * api/index.js). El registro público solo admite roles APRENDIZ o
 * INVITADO (lo valida el propio backend); el resto de roles se asignan desde
 * el panel de administración una vez el usuario ya existe.
 *
 * Antes esto se mandaba por error a POST /user (userService.crearUsuario),
 * una ruta que no existe en api/routes/user.routes.js y que además
 * exige Bearer token — imposible de tener antes de registrarse.
 */
export const register = (payload) => {
  const form = new FormData();
  const { detalle_aprendiz: detalle, ...account } = payload;
  Object.entries(account).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  Object.entries(detalle || {}).forEach(([key, value]) => {
    if (key !== 'imagenes' && value !== undefined && value !== null) form.append(`detalle_aprendiz[${key}]`, value);
  });
  appendFiles(form, detalle?.imagenes);
  return apiClient.post('/auth/storeAuthRegister', form);
};