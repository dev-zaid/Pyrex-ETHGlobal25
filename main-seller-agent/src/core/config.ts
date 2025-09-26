import { getEnv, getEnvBool, getEnvNumber } from '../utils/env';

export interface RouterWeights {
  w_rate: number;
  w_fee: number;
  w_latency: number;
}

function parseWeights(raw: string): RouterWeights {
  const defaults: RouterWeights = { w_rate: 0.6, w_fee: 0.2, w_latency: 0.2 };
  const pairs = raw.split(',');
  const parsed: Partial<RouterWeights> = {};
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map((s) => s.trim());
    if (!key || value === undefined) {
      continue;
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      continue;
    }
    if (['w_rate', 'w_fee', 'w_latency'].includes(key)) {
      (parsed as Record<string, number>)[key] = num;
    }
  }
  return { ...defaults, ...parsed };
}

export const config = {
  server: {
    port: getEnvNumber('PORT', 4000),
  },
  orderbook: {
    baseUrl: getEnv('ORDERBOOK_BASE_URL', 'https://pyrex-ethglobal25.onrender.com'),
  },
  chain: {
    network: getEnv('CHAIN', 'polygon'),
    rpcUrl: getEnv('RPC_URL', ''),
    pyusdAddress: getEnv('PYUSD_ADDRESS', ''),
    agentPrivateKey: getEnv('AGENT_WALLET_PK', ''),
    confirmations: getEnvNumber('CONFIRMATIONS', 2),
  },
  router: {
    weights: parseWeights(getEnv('ROUTER_WEIGHTS', 'w_rate=0.6,w_fee=0.2,w_latency=0.2')),
    maxLatencyMs: getEnvNumber('MAX_LATENCY_MS', 30000),
    maxFeePct: Number(process.env.MAX_FEE_PCT ?? 0.05),
    allowNonPyusd: getEnvBool('ALLOW_NON_PYUSD', false),
  },
  payout: {
    webhookUrl: getEnv('PAYOUT_WEBHOOK_URL', ''),
    mode: getEnv('PAYOUT_MODE', 'mock') as 'mock' | 'real',
  },
};
