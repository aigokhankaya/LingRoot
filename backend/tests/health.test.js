const request = require('supertest');
const express = require('express');

describe('Health Check', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
    });

    it('should return 200 OK', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });
});
