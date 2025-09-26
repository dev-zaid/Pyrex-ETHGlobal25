import { Offer } from '../core/types';
import { config } from '../core/config';
import { normalize } from '../core/math';

export interface RankedOffer extends Offer {
  score: number;
  inr_per_pyusd: number;
}

const MAX_LATENCY_CAP = 60000;

export function rankOffers(offers: Offer[]): RankedOffer[] {
  const eligible = offers.filter((offer) => offer.status === 'active');

  const inrValues = eligible.map((offer) => 1 / Number(offer.rate_pyusd_per_inr));
  const feeValues = eligible.map((offer) => 1 - Number(offer.fee_pct));
  const latencyValues = eligible.map((offer) => Math.min(offer.est_latency_ms, MAX_LATENCY_CAP));

  return eligible
    .map((offer, idx) => {
      const inrPerPyusd = inrValues[idx];
      const feeComponent = feeValues[idx];
      const latencyComponent = latencyValues[idx];

      const score =
        config.router.weights.w_rate * normalize(inrValues, inrPerPyusd) +
        config.router.weights.w_fee * normalize(feeValues, feeComponent) +
        config.router.weights.w_latency * normalize(latencyValues, latencyComponent, true);

      return {
        ...offer,
        score,
        inr_per_pyusd: inrPerPyusd,
      };
    })
    .sort((a, b) => {
      const tokenPriority = Number(b.token === 'PYUSD') - Number(a.token === 'PYUSD');
      if (tokenPriority !== 0) return tokenPriority;
      const chainPriority = Number(b.chain === 'polygon') - Number(a.chain === 'polygon');
      if (chainPriority !== 0) return chainPriority;
      return b.score - a.score;
    });
}
