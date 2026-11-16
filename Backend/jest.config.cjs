module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.routes.test.js', '**/__tests__/**/app.test.js', '**/__tests__/**/auth.middleware.test.js', '**/__tests__/**/lib.test.js'],
  collectCoverageFrom: [
    '!controller/**/*.js', '!middleware/**/*.js', 'routes/**/*.js', '!services/**/*.js', '!lib.js',
    '!app.js',
    '!**/__tests__/**', '!**/__mocks__/**',
    // Plantilla legacy: no está montada y sus imports ('<modulo>') ni siquiera resuelven.
    '!controller/plantilla.controller.js', '!routes/plantilla.routes.js',
  ],
  setupFiles: ['<rootDir>/__tests__/helpers/env.js'],
  clearMocks: true, // Limpia los mocks automáticamente entre pruebas
};
