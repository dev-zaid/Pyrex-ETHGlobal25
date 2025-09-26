import { config } from '../core/config';
import { sendErc20Transfers, TransferInput } from './erc20';
import { logger } from '../utils/logger';

export async function sendPyusdTransfers(transfers: TransferInput[]): Promise<string> {
  logger.info({ transfers }, 'Initiating PYUSD transfers');
  const txHash = await sendErc20Transfers(
    config.chain.rpcUrl,
    config.chain.agentPrivateKey,
    config.chain.pyusdAddress,
    transfers,
  );
  logger.info({ txHash }, 'Transfers completed');
  return txHash;
}
