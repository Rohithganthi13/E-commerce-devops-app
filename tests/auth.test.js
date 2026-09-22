// Integration suite — needs a real, reachable MONGO_URL (not run by `npm test`/CI,
// which has none configured). Run manually via `npm run test:integration`.
const supertest = require('supertest');
const app = require('../app');
const { mongoConnect, getDb } = require('../utils/database');

const testEmail = `auth-test-${Date.now()}@example.com`;
const testPassword = 'password123';

beforeAll((done) => {
  mongoConnect(done);
});

afterAll(async () => {
  await getDb().collection('users').deleteMany({ email: testEmail });
});

test('signup creates a new user and redirects to login', async () => {
  const response = await supertest(app)
    .post('/signup')
    .type('form')
    .send({ name: 'Auth Test', email: testEmail, password: testPassword });

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe('/login');

  const user = await getDb().collection('users').findOne({ email: testEmail });
  expect(user).toBeTruthy();
  expect(user.password).not.toBe(testPassword);
});

test('signup with an existing email is rejected', async () => {
  const response = await supertest(app)
    .post('/signup')
    .type('form')
    .send({ name: 'Auth Test', email: testEmail, password: testPassword });

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe(
    '/signup?error=' + encodeURIComponent('An account with that email already exists'),
  );
});

test('login with correct credentials succeeds', async () => {
  const response = await supertest(app)
    .post('/login')
    .type('form')
    .send({ email: testEmail, password: testPassword });

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe('/');
  expect(response.headers['set-cookie']).toBeDefined();
});

test('login with wrong password is rejected', async () => {
  const response = await supertest(app)
    .post('/login')
    .type('form')
    .send({ email: testEmail, password: 'wrong-password' });

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe(
    '/login?error=' + encodeURIComponent('Invalid email or password'),
  );
});

test('unauthenticated request to /admin/products redirects to /login', async () => {
  const response = await supertest(app).get('/admin/products');

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe('/login');
});

test('unauthenticated request to /cart redirects to /login', async () => {
  const response = await supertest(app).get('/cart');

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe('/login');
});

test('logged-in session can access /admin/products and logout clears it', async () => {
  const agent = supertest.agent(app);

  await agent
    .post('/login')
    .type('form')
    .send({ email: testEmail, password: testPassword });

  const adminResponse = await agent.get('/admin/products');
  expect(adminResponse.status).toBe(200);

  const logoutResponse = await agent.post('/logout');
  expect(logoutResponse.status).toBe(302);
  expect(logoutResponse.headers.location).toBe('/login');

  const afterLogout = await agent.get('/admin/products');
  expect(afterLogout.status).toBe(302);
  expect(afterLogout.headers.location).toBe('/login');
});
