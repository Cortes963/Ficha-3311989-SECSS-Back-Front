// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command -- HEAD
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

const apiUrl = () => Cypress.expose('apiUrl');
const cache = {}; // sesiones por rol (se reinicia en cada spec)
const usuariosRuntime = { ...(Cypress.expose('users') || {}) };

/** Registra credenciales creadas durante la prueba para poder iniciar sesión por API. */
Cypress.Commands.add('registrarCredenciales', (rol, credenciales) => {
  usuariosRuntime[rol] = credenciales;
});
 
/** Inicia sesión por API (una vez por spec y rol). Devuelve { token, id, roles, usuario }. */
Cypress.Commands.add('sesionApi', (rol) => {
  if (cache[rol]) return cy.wrap(cache[rol], { log: false });
  const cred = usuariosRuntime[rol];
  if (!cred || !cred.documento) throw new Error(`Falta users.${rol} en cypress.expose.json`);
  return cy.request({
    method: 'POST',
    url: `${apiUrl()}/auth/storeAuthLogin`,
    body: { numero_documento: cred.documento, password: cred.password },
    failOnStatusCode: false,
    log: false,
  }).then(({ status, body }) => {
    expect(status, `login del rol ${rol}`).to.eq(200);
    cache[rol] = { token: body.token, id: body.usuario.id, roles: body.usuario.roles, usuario: body.usuario };
    return cache[rol];
  });
});
 
/**
 * Petición a la API autenticada como `rol` (o sin sesión si rol es null).
 * opts: body, qs, auth (header Authorization literal), baseUrl.
 */
Cypress.Commands.add('apiCall', (rol, method, path, opts = {}) => {
  const { auth, baseUrl, headers, ...rest } = opts;
  const enviar = (authorization) => cy.request({
    method,
    url: `${baseUrl ?? apiUrl()}${path}`,
    headers: { ...(authorization ? { Authorization: authorization } : {}), ...headers },
    failOnStatusCode: false,
    ...rest,
  });
  if (auth !== undefined) return enviar(auth);
  if (!rol) return enviar(null);
  return cy.sesionApi(rol).then((s) => enviar(`Bearer ${s.token}`));
});
 
/** multipart/form-data. archivos: [{ campo, nombre, tipo, contenido }]. Devuelve { status, body }.
 *  Se envía desde Node (cy.task) para evitar el "Failed to fetch" por CORS del navegador. */
const aBase64 = (contenido) => {
  const bytes = contenido instanceof Uint8Array ? contenido : new Uint8Array(contenido);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
Cypress.Commands.add('apiMultipartToken', (token, path, campos = {}, archivos = [], method = 'POST') => {
  return cy.task('apiMultipart', {
    url: `${apiUrl()}${path}`,
    method,
    token,
    campos,
    archivos: archivos.map(({ campo, nombre, tipo, contenido }) => ({ campo, nombre, tipo, contenidoB64: aBase64(contenido) })),
  }, { timeout: 30000, log: false });
});

/** multipart/form-data autenticado por rol o público cuando rol es null. */
Cypress.Commands.add('apiMultipart', (rol, path, campos = {}, archivos = [], method = 'POST') => {
  if (!rol) return cy.apiMultipartToken(null, path, campos, archivos, method);
  return cy.sesionApi(rol).then((s) => cy.apiMultipartToken(s.token, path, campos, archivos, method));
});
 
/** Dispara varias peticiones JSON a la vez (pruebas de concurrencia). Devuelve [{ status, body }]. */
Cypress.Commands.add('apiParalelo', (rol, peticiones) =>
  cy.sesionApi(rol).then((s) =>
    cy.task('apiParalelo', { token: s.token, base: apiUrl(), peticiones }, { timeout: 30000, log: false })));
 
/** Deja la sesión del frontend iniciada (token + usuario en localStorage) sin pasar por el formulario. */
Cypress.Commands.add('uiLogin', (rol) => {
  cy.sesionApi(rol).then((s) => {
    cy.session(['ui', rol, s.token], () => {
      cy.visit('/login');
      cy.window().then((win) => {
        win.localStorage.setItem('secss_token', s.token);
        win.localStorage.setItem('secss_usuario', JSON.stringify(s.usuario));
      });
    });
  });
});
 

// Cypress.Commands=======.overwrite('visit', (originalFn, url, options) => { ... })
// 4d850a5 (chore: correciones attetion)
