const { ethers } = require('ethers');
const {
  canonicalize,
  hashCanonicalString,
  verifySignature,
} = require('../src/services/signature');

describe('signature canonicalization and verification', () => {
  const wallet = ethers.Wallet.createRandom();

  const offer = {
    seller_pubkey: wallet.address,
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
    nonce: 7,
    expiry_timestamp: '2025-10-01T00:00:00Z',
  };

  test('canonical string uses expected formatting', () => {
    const canonical = canonicalize(offer);
    expect(canonical).toContain('0.012345678901234567');
    expect(canonical).toContain('500.00000000');
  });

  test('verifySignature returns true for valid signature', async () => {
    const canonical = canonicalize(offer);
    const digest = hashCanonicalString(canonical);
    const signature = await wallet.signMessage(ethers.getBytes(digest));

    const isValid = verifySignature(offer, signature);
    expect(isValid).toBe(true);
  });

  test('verifySignature returns false for tampered data', async () => {
    const canonical = canonicalize(offer);
    const digest = hashCanonicalString(canonical);
    const signature = await wallet.signMessage(ethers.getBytes(digest));

    const tampered = { ...offer, available_pyusd: '600' };

    const isValid = verifySignature(tampered, signature);
    expect(isValid).toBe(false);
  });
});
