import express from 'express';

// Mini-app de Express para pruebas con supertest: monta SOLO el router a probar.
// requireAuth se sustituye por un middleware que inyecta el usuario "ya autenticado",
// así cada prueba elige el rol sin firmar tokens. (El middleware real ya se prueba en auth.middleware.test.js.)
export function appWith(router, user, prefix = '/api') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  app.use(prefix, router);
  return app;
}
