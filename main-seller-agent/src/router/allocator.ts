import { RankedOffer } from './ranker';

export interface AllocationResult {
  allocations: Array<{
    offer: RankedOffer;
    amount_pyusd: number;
    expected_inr: number;
  }>;
  total_pyusd: number;
  total_inr: number;
}

export function allocateOffers(
  ranked: RankedOffer[],
  targetPyusd: number,
  allowPartialMinimum = true
): AllocationResult {
  const result: AllocationResult = { allocations: [], total_pyusd: 0, total_inr: 0 };
  let remaining = targetPyusd;

  for (const offer of ranked) {
    if (remaining <= 0) break;

    const available = Number(offer.available_pyusd);
    const max = Number(offer.max_pyusd);
    const min = Number(offer.min_pyusd);
    if (available <= 0) continue;

    const take = Math.min(remaining, Math.min(available, max));

    if (take < min && !(allowPartialMinimum && take === remaining)) {
      continue;
    }

    const expectedInr = take * offer.inr_per_pyusd * (1 - Number(offer.fee_pct));
    result.allocations.push({ offer, amount_pyusd: take, expected_inr: expectedInr });
    result.total_pyusd += take;
    result.total_inr += expectedInr;
    remaining -= take;
  }

  return result;
}
