module.exports = {
  testEnvironment: 'jsdom',        // Pour React (frontend)
  // testEnvironment: 'node',     // Pour Node.js (backend)
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy'  // Pour les fichiers CSS
    
  }
    globalSetup: '<rootDir>/jest.setup.js',
  globalTeardown: '<rootDir>/jest.teardown.js',
  testEnvironment: 'node'
};