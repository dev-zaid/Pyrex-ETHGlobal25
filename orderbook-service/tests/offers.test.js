process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://fxbridge:fxbridge_pass@localhost:5432/fxbridge_db';

const request = require('supertest');
const { ethers } = require('ethers');
const app = require('../src/app');
const db = require('../src/db');
const { canonicalizeOffer, hashCanonicalString, canonicalizeCancel } = require('../src/services/signature');

const truncateOffers = async () => {
  await db.query('TRUNCATE TABLE offers RESTART IDENTITY');
};

const wallet = new ethers.Wallet(
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
);
const secondWallet = new ethers.Wallet(
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'
);

function buildOffer(overrides = {}) {
  return {
    seller_pubkey: overrides.seller_pubkey || wallet.address,
    chain: 'polygon',
    token: 'PYUSD',
    rate_pyusd_per_inr: '0.012345678901234567',
    min_pyusd: '10',
    max_pyusd: '1000',
    available_pyusd: '500',
    fee_pct: '0.0025',
    est_latency_ms: 12000,
    supports_swap: true,
    upi_enabled: true,
    nonce: 1,
    expiry_timestamp: '2025-10-01T00:00:00Z',
    ...overrides,
  };
}

async function signOffer(offer, signer = wallet) {
  const canonical = canonicalizeOffer(offer);
  const digest = hashCanonicalString(canonical);
  return signer.signMessage(ethers.getBytes(digest));
}

async function signCancel(offerId, nonce, signer = wallet) {
  const canonical = canonicalizeCancel(offerId, nonce);
  const digest = hashCanonicalString(canonical);
  return signer.signMessage(ethers.getBytes(digest));
}

afterAll(async () => {
  await db.pool.end();
});

beforeEach(async () => {
  await truncateOffers();
});

describe('POST /offers', () => {
  test('creates a new offer and returns stored record', async () => {
    const offer = buildOffer();
    const signature = await signOffer(offer);

    const response = await request(app)
      .post('/offers')
      .send({ ...offer, signature })
      .expect(201);

    expect(response.body).toMatchObject({
      seller_pubkey: wallet.address,
      chain: 'polygon',
      token: 'PYUSD',
      status: 'active',
    });
    expect(response.body.signature).toBeUndefined();

    const { rows } = await db.query('SELECT * FROM offers');
    expect(rows).toHaveLength(1);
    expect(rows[0].seller_pubkey).toEqual(wallet.address);
  });

  test('rejects invalid signatures', async () => {
    const offer = buildOffer();
    const otherWallet = ethers.Wallet.createRandom();
    const signature = await signOffer(offer, otherWallet);

    const response = await request(app)
      .post('/offers')
      .send({ ...offer, signature });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid signature/i);
  });

  test('rejects lower or equal nonce for existing seller', async () => {
    const initialOffer = buildOffer({ nonce: 2 });
    const initialSignature = await signOffer(initialOffer);

    await request(app)
      .post('/offers')
      .send({ ...initialOffer, signature: initialSignature })
      .expect(201);

    const staleOffer = buildOffer({ nonce: 1, available_pyusd: '400' });
    const staleSignature = await signOffer(staleOffer);

    const response = await request(app)
      .post('/offers')
      .send({ ...staleOffer, signature: staleSignature });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/nonce/i);
  });
});

describe('GET /offers endpoints', () => {
  test('lists active offers with filters applied', async () => {
    const offer1 = buildOffer({ nonce: 1, available_pyusd: '100', rate_pyusd_per_inr: '0.010000000000000000' });
    const offer2 = buildOffer({ nonce: 2, available_pyusd: '200', rate_pyusd_per_inr: '0.020000000000000000' });

    await request(app).post('/offers').send({ ...offer1, signature: await signOffer(offer1) });
    await request(app).post('/offers').send({ ...offer2, signature: await signOffer(offer2) });

    const response = await request(app)
      .get('/offers')
      .query({ min_amount: '150', sort: 'rate_desc' })
      .expect(200);

    expect(response.body.count).toBe(1);
    expect(response.body.offers[0].available_pyusd).toBe('200.00000000');
  });

  test('excludes expired offers from results and detail fetch', async () => {
    const futureOffer = buildOffer({ nonce: 1, available_pyusd: '300', expiry_timestamp: new Date(Date.now() + 60_000).toISOString() });
    const futureSig = await signOffer(futureOffer);

    const expiredOffer = buildOffer({
      seller_pubkey: secondWallet.address,
      nonce: 1,
      available_pyusd: '150',
      expiry_timestamp: '2020-01-01T00:00:00Z',
    });
    const expiredSig = await signOffer(expiredOffer, secondWallet);

    await request(app).post('/offers').send({ ...futureOffer, signature: futureSig });

    const createExpired = await request(app)
      .post('/offers')
      .send({ ...expiredOffer, signature: expiredSig });
    const expiredId = createExpired.body.id;

    const listResp = await request(app).get('/offers').expect(200);
    expect(listResp.body.count).toBe(1);
    expect(listResp.body.offers[0].seller_pubkey).toBe(futureOffer.seller_pubkey);

    const detailResp = await request(app).get(`/offers/${expiredId}`).expect(404);
    expect(detailResp.body.error).toMatch(/not found/i);
  });

  test('returns 404 for missing offer by id', async () => {
    const response = await request(app)
      .get('/offers/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(response.body.error).toMatch(/not found/i);
  });

  test('fetches offer by id', async () => {
    const offer = buildOffer({ nonce: 1 });
    const signature = await signOffer(offer);

    const createResponse = await request(app)
      .post('/offers')
      .send({ ...offer, signature })
      .expect(201);

    const offerId = createResponse.body.id;

    const getResponse = await request(app)
      .get(`/offers/${offerId}`)
      .expect(200);

    expect(getResponse.body.id).toBe(offerId);
  });
});

describe('POST /offers/:id/cancel', () => {
  test('cancels offer with valid signature and nonce', async () => {
    const offer = buildOffer({ nonce: 1 });
    const signature = await signOffer(offer);
    const createResponse = await request(app)
      .post('/offers')
      .send({ ...offer, signature })
      .expect(201);

    const offerId = createResponse.body.id;
    const cancelNonce = 2n;
    const cancelSignature = await signCancel(offerId, cancelNonce);

    const cancelResponse = await request(app)
      .post(`/offers/${offerId}/cancel`)
      .send({ seller_pubkey: offer.seller_pubkey, nonce: cancelNonce.toString(), signature: cancelSignature })
      .expect(200);

    expect(cancelResponse.body.status).toBe('cancelled');

    const { rows } = await db.query('SELECT status, nonce FROM offers WHERE id = $1', [offerId]);
    expect(rows[0].status).toBe('cancelled');
    expect(rows[0].nonce).toBe(cancelNonce.toString());
  });

  test('rejects cancel with stale nonce', async () => {
    const offer = buildOffer({ nonce: 2 });
    const signature = await signOffer(offer);
    const createResponse = await request(app)
      .post('/offers')
      .send({ ...offer, signature })
      .expect(201);

    const offerId = createResponse.body.id;
    const staleNonce = 1n;
    const cancelSignature = await signCancel(offerId, staleNonce);

    const response = await request(app)
      .post(`/offers/${offerId}/cancel`)
      .send({ seller_pubkey: offer.seller_pubkey, nonce: staleNonce.toString(), signature: cancelSignature });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/nonce/i);
  });
});

describe('PATCH /offers/:id', () => {
  test('updates available amount with valid signature and nonce', async () => {
    const offer = buildOffer({ nonce: 1 });
    const signature = await signOffer(offer);
    const createResponse = await request(app)
      .post('/offers')
      .send({ ...offer, signature })
      .expect(201);

    const offerId = createResponse.body.id;
    const updateNonce = 2n;
    const updatedOffer = {
      ...offer,
      available_pyusd: '300',
      nonce: updateNonce,
    };
    const updateSignature = await signOffer(updatedOffer);

    const response = await request(app)
      .patch(`/offers/${offerId}`)
      .send({
        seller_pubkey: offer.seller_pubkey,
        available_pyusd: updatedOffer.available_pyusd,
        nonce: updateNonce.toString(),
        signature: updateSignature,
      })
      .expect(200);

    expect(response.body.available_pyusd).toBe('300.00000000');

    const { rows } = await db.query('SELECT available_pyusd, nonce FROM offers WHERE id = $1', [offerId]);
    expect(rows[0].available_pyusd).toBe('300.00000000');
    expect(rows[0].nonce).toBe(updateNonce.toString());
  });

  test('rejects update with invalid signature', async () => {
    const offer = buildOffer({ nonce: 1 });
    const signature = await signOffer(offer);
    const createResponse = await request(app)
      .post('/offers')
      .send({ ...offer, signature })
      .expect(201);

    const offerId = createResponse.body.id;
    const updateNonce = 2n;
    const otherWallet = ethers.Wallet.createRandom();
    const updateSignature = await signOffer({ ...offer, nonce: updateNonce }, otherWallet);

    const response = await request(app)
      .patch(`/offers/${offerId}`)
      .send({
        seller_pubkey: offer.seller_pubkey,
        available_pyusd: '300',
        nonce: updateNonce.toString(),
        signature: updateSignature,
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid signature/i);
  });

  test('rejects update with stale nonce', async () => {
    const offer = buildOffer({ nonce: 2 });
    const signature = await signOffer(offer);
    const createResponse = await request(app)
      .post('/offers')
      .send({ ...offer, signature })
      .expect(201);

    const offerId = createResponse.body.id;
    const staleNonce = 1n;
    const updatedOffer = { ...offer, nonce: staleNonce, available_pyusd: '400' };
    const updateSignature = await signOffer(updatedOffer);

    const response = await request(app)
      .patch(`/offers/${offerId}`)
      .send({
        seller_pubkey: offer.seller_pubkey,
        available_pyusd: updatedOffer.available_pyusd,
        nonce: staleNonce.toString(),
        signature: updateSignature,
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/nonce/i);
  });
});
