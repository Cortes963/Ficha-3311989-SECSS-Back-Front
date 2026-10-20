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
 
/** multipart/form-data. archivos: [{ campo, nombre, tipo, contenido }]. Devuelve { status, body }. */
Cypress.Commands.add('apiMultipartToken', (token, path, campos = {}, archivos = [], method = 'POST') => {
    const form = new FormData();
    Object.entries(campos).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, v); });
    archivos.forEach((a) => form.append(a.campo, new Blob([a.contenido], { type: a.tipo }), a.nombre));
    const promesa = fetch(`${apiUrl()}${path}`, {
      method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form,
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
    return cy.wrap(promesa, { timeout: 30000, log: false });
});

/** multipart/form-data autenticado por rol o público cuando rol es null. */
Cypress.Commands.add('apiMultipart', (rol, path, campos = {}, archivos = [], method = 'POST') => {
  if (!rol) return cy.apiMultipartToken(null, path, campos, archivos, method);
  return cy.sesionApi(rol).then((s) => cy.apiMultipartToken(s.token, path, campos, archivos, method));
});
 
/** Dispara varias peticiones JSON a la vez (pruebas de concurrencia). Devuelve [{ status, body }]. */
Cypress.Commands.add('apiParalelo', (rol, peticiones) =>
  cy.sesionApi(rol).then((s) => {
    const promesas = peticiones.map(({ method, path, body }) =>
      fetch(`${apiUrl()}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) })));
    return cy.wrap(Promise.all(promesas), { timeout: 30000, log: false });
  }));
 
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
