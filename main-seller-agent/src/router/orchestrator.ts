import { v4 as uuidv4 } from 'uuid';
import { RouteRequest, RouteResponse, MatchedOffer } from '../core/types';
import { fetchOffers } from '../db/offers.repo';
import { rankOffers } from './ranker';
import { allocateOffers } from './allocator';
import { logger } from '../utils/logger';
import { config } from '../core/config';

function determineTargetPyusd(request: RouteRequest, rankedScores: ReturnType<typeof rankOffers>): number {
  if (request.target_pyusd) {
    return Number(request.target_pyusd);
  }
  if (!request.target_inr) {
    throw new Error('Either target_pyusd or target_inr must be provided');
  }
  const totalInrPerPyusd = rankedScores.reduce((sum, offer) => sum + offer.inr_per_pyusd, 0);
  if (totalInrPerPyusd === 0) {
    throw new Error('No liquidity available to price INR target');
  }
  const averageInrPerPyusd = totalInrPerPyusd / rankedScores.length;
  return Number(request.target_inr) / averageInrPerPyusd;
}

export async function routePayment(request: RouteRequest): Promise<RouteResponse> {
  const auditId = uuidv4();
  logger.info({ auditId, request }, 'Received routing request');

  const offers = await fetchOffers(request.constraints);
  if (offers.length === 0) {
    throw new Error('No offers available');
  }
  const ranked = rankOffers(offers);
  const targetPyusd = determineTargetPyusd(request, ranked);
  const allocation = allocateOffers(ranked, targetPyusd);

  if (allocation.total_pyusd < targetPyusd) {
    throw new Error('Insufficient liquidity to satisfy request');
  }

  const matched: MatchedOffer[] = [];
  for (const chunk of allocation.allocations) {
    matched.push({
      offer_id: chunk.offer.id,
      seller_pubkey: chunk.offer.seller_pubkey,
      token: chunk.offer.token,
      chain: chunk.offer.chain,
      rate: Number(chunk.offer.rate_pyusd_per_inr),
      fee_pct: Number(chunk.offer.fee_pct),
      reserved_pyusd: chunk.amount_pyusd,
      expected_inr: chunk.expected_inr,
      reservation_id: 'pending',
      est_latency_ms: chunk.offer.est_latency_ms,
    });
  }

  const weightedLatency = matched.length
    ? matched.reduce((sum, m) => sum + m.est_latency_ms * m.reserved_pyusd, 0) /
      matched.reduce((sum, m) => sum + m.reserved_pyusd, 0)
    : 0;

  return {
    audit_id: auditId,
    matched_offers: matched,
    totals: {
      total_pyusd: allocation.total_pyusd,
      total_inr_estimated: allocation.total_inr,
      weighted_latency_ms: weightedLatency,
    },
    onchain_transfers: [],
    seller_payouts: [],
  };
}
