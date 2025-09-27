import axios from 'axios';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

const CASHFREE_BASE_URL = getEnv('CASHFREE_BASE_URL', 'https://payout-gamma.cashfree.com');
const CASHFREE_AUTH_TOKEN = getEnv('CASHFREE_AUTH_TOKEN');

export interface CashfreeTransferRequest {
  transferMode: 'upi';
  amount: number;
  transferId: string;
  beneDetails: {
    name: string;
    phone: string;
    email: string;
    address1: string;
    vpa: string;
  };
}

export interface CashfreeTransferResponse {
  referenceId: string;
  status: string;
  amount: number;
}

const client = axios.create({
  baseURL: `${CASHFREE_BASE_URL}/payout/v1`,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${CASHFREE_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

export async function createDirectTransfer(request: CashfreeTransferRequest): Promise<CashfreeTransferResponse> {
  logger.info({ request }, 'Initiating Cashfree direct transfer');
  const { data } = await client.post<CashfreeTransferResponse>('/directTransfer', request);
  return data;
}
