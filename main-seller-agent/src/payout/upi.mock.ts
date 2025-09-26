import axios from 'axios';
import { config } from '../core/config';
import { logger } from '../utils/logger';

interface PayoutPayload {
  reservationId: string;
  sellerPubkey: string;
  amountInr: number;
  txHash: string;
}

export async function triggerPayout(payload: PayoutPayload): Promise<string> {
  logger.info({ payload }, 'Triggering seller payout');
  const reference = `payout-${payload.reservationId}`;

  if (config.payout.mode === 'real' && config.payout.webhookUrl) {
    await axios.post(config.payout.webhookUrl, {
      reservation_id: payload.reservationId,
      seller_pubkey: payload.sellerPubkey,
      amount_inr: payload.amountInr,
      tx_hash: payload.txHash,
    });
  }

  return reference;
}
