import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handleRequest } from '../src/router.js';

test('Staff authentication and role permissions', async (t) => {
  const server = http.createServer((req, res) => {
    void handleRequest(req, res);
  });
  const { promise: listening, resolve: onListening } = Promise.withResolvers<void>();
  server.listen(0, '127.0.0.1', () => onListening());
  await listening;
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(() => server.close());

  const login = async (email: string, password: string) => {
    const res = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body: unknown = await res.json();
    let token: string | undefined;
    if (body && typeof body === 'object' && 'token' in body && typeof body.token === 'string') {
      token = body.token;
    }
    return { res, body, token };
  };

  await t.test('unauthenticated access to manager routes is rejected', async () => {
    const res = await fetch(`${base}/api/v1/simple/dishes`);
    assert.equal(res.status, 401);
  });

  await t.test('invalid credentials are rejected', async () => {
    const { res } = await login('admin@janitou.dz', 'wrong-password');
    assert.equal(res.status, 401);
  });

  await t.test('admin can access manager routes', async () => {
    const { res, token } = await login('admin@janitou.dz', 'Admin@2026');
    assert.equal(res.status, 200);
    assert.ok(token);
    const dishes = await fetch(`${base}/api/v1/simple/dishes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(dishes.status, 200);
    const clients = await fetch(`${base}/api/v1/simple/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(clients.status, 200);
  });

  await t.test('chef is blocked from settings and client administration', async () => {
    const { res, token } = await login('chef@janitou.dz', 'Chef@2026');
    assert.equal(res.status, 200);
    assert.ok(token);

    const dishes = await fetch(`${base}/api/v1/simple/dishes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(dishes.status, 200);

    const settings = await fetch(`${base}/api/v1/simple/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(settings.status, 403);

    const clients = await fetch(`${base}/api/v1/simple/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(clients.status, 403);
  });

  await t.test('logout invalidates the session', async () => {
    const { token } = await login('ops@janitou.dz', 'Ops@2026');
    assert.ok(token);
    const me = await fetch(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(me.status, 200);

    const logout = await fetch(`${base}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logout.status, 200);

    const after = await fetch(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(after.status, 401);
  });

  await t.test('customer app routes do not accept a staff session', async () => {
    const { token } = await login('admin@janitou.dz', 'Admin@2026');
    assert.ok(token);
    const res = await fetch(`${base}/api/v1/client/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 401);
  });
});
