import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Wallet } from 'ethers';
import { SiweMessage } from 'siwe';
import { createApp } from '../app.js';
import { InMemoryAuthStore } from './store.js';

const DOMAIN = 'localhost:3000';
const URI = 'http://localhost:3000';
const CHAIN_ID = 421614;

function buildMessage(address: string, nonce: string): string {
  return new SiweMessage({
    domain: DOMAIN,
    address,
    statement: 'Sign in to RaiseDAO',
    uri: URI,
    version: '1',
    chainId: CHAIN_ID,
    nonce,
  }).prepareMessage();
}

describe('SIWE auth flow', () => {
  it('issues a JWT for a valid signature and serves /auth/me', async () => {
    const app = createApp({ authStore: new InMemoryAuthStore() });
    const wallet = Wallet.createRandom();

    const { body: challenge } = await request(app)
      .post('/auth/nonce')
      .send({ address: wallet.address });
    const message = buildMessage(wallet.address, challenge.nonce);
    const signature = await wallet.signMessage(message);

    const res = await request(app).post('/auth/verify').send({ message, signature });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.address).toBe(wallet.address.toLowerCase());
    expect(res.body.roles).toContain('investor');

    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.address).toBe(wallet.address.toLowerCase());
  });

  it('rejects verify when there is no pending nonce', async () => {
    const app = createApp({ authStore: new InMemoryAuthStore() });
    const wallet = Wallet.createRandom();
    const message = buildMessage(wallet.address, 'deadbeefdeadbeef00');
    const signature = await wallet.signMessage(message);

    const res = await request(app).post('/auth/verify').send({ message, signature });
    expect(res.status).toBe(401);
  });

  it('rejects a signature from the wrong wallet', async () => {
    const app = createApp({ authStore: new InMemoryAuthStore() });
    const wallet = Wallet.createRandom();
    const { body: challenge } = await request(app)
      .post('/auth/nonce')
      .send({ address: wallet.address });
    const message = buildMessage(wallet.address, challenge.nonce);
    const signature = await Wallet.createRandom().signMessage(message); // different signer

    const res = await request(app).post('/auth/verify').send({ message, signature });
    expect(res.status).toBe(401);
  });

  it('protects /auth/me without a token', async () => {
    const app = createApp({ authStore: new InMemoryAuthStore() });
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
