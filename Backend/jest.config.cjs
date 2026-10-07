module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  clearMocks: true, // Limpia los mocks automáticamente entre pruebas
};
