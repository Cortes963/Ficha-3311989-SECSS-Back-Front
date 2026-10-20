import { defineConfig } from "cypress";

const passwordPruebas = "SECSS-Testing-2026!";
const docAprendiz = "1055444333";
const docAdmin = "1021312836";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(on, config) {
      // Las peticiones multipart y en paralelo se hacen desde Node (no desde el navegador):
      // así no dependen del CORS de la API ni de que el fetch del navegador llegue al backend.
      const base64ABytes = (b64) => Buffer.from(b64, "base64");
      on("task", {
        async apiMultipart({ url, method = "POST", token, campos = {}, archivos = [] }) {
          const form = new FormData();
          Object.entries(campos).forEach(([k, v]) => {
            if (v !== undefined && v !== null) form.append(k, String(v));
          });
          archivos.forEach((a) => {
            form.append(a.campo, new Blob([base64ABytes(a.contenidoB64)], { type: a.tipo }), a.nombre);
          });
          const r = await fetch(url, {
            method,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
          });
          return { status: r.status, body: await r.json().catch(() => null) };
        },
        async apiParalelo({ token, base, peticiones }) {
          return Promise.all(
            peticiones.map(async ({ method, path, body }) => {
              const r = await fetch(`${base}${path}`, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: body === undefined ? undefined : JSON.stringify(body),
              });
              return { status: r.status, body: await r.json().catch(() => null) };
            })
          );
        },
      });
      return config;
    },
  },
  expose: {
    // Valores públicos de prueba (Cypress 16: se leen con Cypress.expose)
    // API del backend (puerto 4000 según Backend/server.js)
    apiUrl: "http://localhost:4000/api",
    // Usuarios de prueba (mismos de la colección Postman del proyecto)
    docAprendiz,
    docAdmin,
    password: passwordPruebas,
    users: {
      // Alias consumidos por input_output.cy.js, quota.cy.js y 00 transversal.cy.js.
      // Los alias aprendiz y aprendiz1 apuntan al mismo usuario semilla del DML.
      aprendiz: { documento: docAprendiz, password: passwordPruebas },
      aprendiz1: { documento: docAprendiz, password: passwordPruebas },
      aprendiz2: { documento: "900000006", password: passwordPruebas },
      aprendiz3: { documento: "900000007", password: passwordPruebas },
      aprendiz4: { documento: "900000008", password: passwordPruebas },
      admin: { documento: docAdmin, password: passwordPruebas },
      jefe: { documento: "80112233", password: passwordPruebas },
      celador: { documento: "79888777", password: passwordPruebas },
      celador2: { documento: "19444555", password: passwordPruebas },
      invitado1: { documento: "900000009", password: passwordPruebas },
    },
    // IDs deterministas insertados por DML - SECSS - PRUEBAS.sql.
    seed: {
      aprendiz4: { vehiculoA: 4, vehiculoB: 7 },
      usuarioInactivoId: 10,
    },
  },
});