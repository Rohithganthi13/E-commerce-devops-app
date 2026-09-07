const supertest = require('supertest');
const app = require('../app');

test('check the application health',async()=>{
    const response = await supertest(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("unhealthy")
})