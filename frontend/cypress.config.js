import { defineConfig } from "cypress";

const passwordPruebas = "SECSS-Testing-2026!";
const docAprendiz = "1055444333";
const docAdmin = "1021312836";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(on, config) {
      // implement node event listeners here
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
