const request = require('supertest');
const app = require('../server'); // Updated path to server.js
const mongoose = require('mongoose');

describe('API Tests', () => {
    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGO_URI);
    });

    afterAll(async () => {
        // Close database connection
        await mongoose.disconnect();
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
            expect(response.body).toHaveProperty('id');
        });
    });
});