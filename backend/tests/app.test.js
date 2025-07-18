const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const { setup, teardown } = require('./jest.setup');

// Global setup and teardown
beforeAll(async () => {
    await setup();
});

afterAll(async () => {
    await teardown();
});

describe('API Tests', () => {
    beforeEach(async () => {
        // Clean database between tests
        await mongoose.connection.db.dropDatabase();
    });

    describe('GET /api', () => {
        it('should return 200 OK', async () => {
            const response = await request(app).get('/api');
            expect(response.status).toBe(200);
        });
    });

    describe('POST /api/users', () => {
        it('should create a user', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({ name: 'John' });
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
        });
    });
});