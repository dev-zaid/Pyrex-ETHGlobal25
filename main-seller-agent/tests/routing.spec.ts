import { allocateOffers } from '../src/router/allocator';
import { rankOffers } from '../src/router/ranker';
import { Offer } from '../src/core/types';

describe('allocator', () => {
  it('allocates across offers until target achieved', () => {
    const offers: Offer[] = [
      {
        id: '1',
        seller_pubkey: '0x1',
        chain: 'polygon',
        token: 'PYUSD',
        rate_pyusd_per_inr: '0.01',
        min_pyusd: '10',
        max_pyusd: '100',
        available_pyusd: '100',
        fee_pct: '0.001',
        est_latency_ms: 8000,
        supports_swap: true,
        upi_enabled: true,
        status: 'active',
        nonce: '1',
        expiry_timestamp: null,
      },
      {
        id: '2',
        seller_pubkey: '0x2',
        chain: 'polygon',
        token: 'PYUSD',
        rate_pyusd_per_inr: '0.011',
        min_pyusd: '5',
        max_pyusd: '50',
        available_pyusd: '50',
        fee_pct: '0.002',
        est_latency_ms: 12000,
        supports_swap: true,
        upi_enabled: true,
        status: 'active',
        nonce: '1',
        expiry_timestamp: null,
      },
    ];

    const ranked = rankOffers(offers);
    const result = allocateOffers(ranked, 120);
    expect(result.total_pyusd).toBeGreaterThanOrEqual(120);
    expect(result.allocations.length).toBeGreaterThan(0);
  });
});
