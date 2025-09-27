import { logger } from '../utils/logger';

export interface TransferInput {
  to: string;
  amount: number;
}

export async function sendPyusdTransfers(transfers: TransferInput[]): Promise<string> {
  logger.info({ transfers }, 'Simulating PYUSD transfers (no-op)');
  return `simulated-${Date.now()}`;
}
