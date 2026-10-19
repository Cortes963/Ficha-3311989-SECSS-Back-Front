import { defineConfig } from "cypress";

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
    docAprendiz: "1055444333",
    docAdmin: "1021312836",
    password: "SECSS-Testing-2026!",
  },
});