const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');

describe('API Tests', () => {
    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    afterAll(async () => {
        // Clean up and close connections
        await mongoose.connection.db.dropDatabase();
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
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
        });
    });
});