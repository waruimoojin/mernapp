const request = require('supertest');
const app = require('../server'); // Importez votre application Express

// Test d'une route GET
describe('GET /api', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
  });
});

// Test d'une route POST
describe('POST /api/users', () => {
  it('should create a user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John' });
    expect(response.body).toHaveProperty('id');
  });
});