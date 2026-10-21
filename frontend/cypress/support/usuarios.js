// Credenciales públicas definidas en cypress.config.js más usuarios desechables
// registrados durante el spec actual.
const RUNTIME_USERS = '__secssRuntimeUsers';

const usuariosRuntime = () => {
  globalThis[RUNTIME_USERS] ??= { ...(Cypress.expose('users') || {}) };
  return globalThis[RUNTIME_USERS];
};

/** Permite que los comandos de Cypress compartan credenciales creadas en runtime. */
export const registrarUsuario = (rol, credenciales) => {
  usuariosRuntime()[rol] = credenciales;
};

export const credenciales = (rol) => {
  const usuario = usuariosRuntime()[rol] || Cypress.expose('users')?.[rol];
  if (!usuario?.documento || !usuario?.password) {
    throw new Error(`No hay credenciales registradas para "${rol}" en Cypress.`);
  }
  return usuario;
};

export const documentoDe = (rol) => credenciales(rol).documento;

/** Lee valores públicos de configuración declarados en Cypress.expose. */
export const leerConfig = (clave) => Cypress.expose(clave);
