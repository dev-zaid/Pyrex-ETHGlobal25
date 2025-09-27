import { randomUUID } from 'crypto';
import { RouteRequest, RouteResponse, MatchedOffer } from '../core/types';
import { fetchOffers } from '../db/offers.repo';
import { reserveOffer, releaseReservation } from '../db/reservations.repo';
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
  const auditId = randomUUID();
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
  const reservedIds: string[] = [];

  try {
    for (const chunk of allocation.allocations) {
      const reservation = await reserveOffer(chunk.offer.id, chunk.amount_pyusd);
      reservedIds.push(reservation.reservation_id);

      matched.push({
        offer_id: chunk.offer.id,
        seller_pubkey: chunk.offer.seller_pubkey,
        token: chunk.offer.token,
        chain: chunk.offer.chain,
        rate: Number(chunk.offer.rate_pyusd_per_inr),
        fee_pct: Number(chunk.offer.fee_pct),
        reserved_pyusd: chunk.amount_pyusd,
        expected_inr: chunk.expected_inr,
        reservation_id: reservation.reservation_id,
        est_latency_ms: chunk.offer.est_latency_ms,
      });
    }
  } catch (error) {
    logger.error({ error, auditId }, 'Failed to reserve liquidity; rolling back');
    await Promise.all(
      reservedIds.map(async (id) => {
        try {
          await releaseReservation(id);
        } catch (releaseError) {
          logger.error({ releaseError, reservationId: id }, 'Failed to release reservation during rollback');
        }
      })
    );
    throw error;
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
