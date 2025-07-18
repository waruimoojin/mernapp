testEnvironment: 'jsdom';
setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'];
collectCoverageFrom: [
  '**/*.{js,jsx}',
  '!**/node_modules/**',
  '!**/coverage/**',
  '!**/test-results/**'
];