module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
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
