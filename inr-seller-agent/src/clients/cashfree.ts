import axios from 'axios';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { CashfreeApiError } from '../errors';

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
  referenceId?: string;
  status: string;
  amount?: number;
  message?: string;
  subCode?: string;
}

export type CashfreeTransferSuccessResponse = Required<Pick<CashfreeTransferResponse, 'referenceId'>> &
  Pick<CashfreeTransferResponse, 'status' | 'amount'>;

const client = axios.create({
  baseURL: `${CASHFREE_BASE_URL}/payout/v1`,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${CASHFREE_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

export async function createDirectTransfer(
  request: CashfreeTransferRequest,
): Promise<CashfreeTransferSuccessResponse> {
  logger.info({ request }, 'Initiating Cashfree direct transfer');

  try {
    const response = await client.post<CashfreeTransferResponse>('/directTransfer', request);
    const { data, status: httpStatus } = response;

    if (!data || data.status !== 'SUCCESS') {
      const details = {
        httpStatus,
        provider_status: data?.status,
        provider_sub_code: data?.subCode,
        provider_message: data?.message,
        raw: data,
      };
      logger.error({ details }, 'Cashfree direct transfer returned non-success status');
      throw new CashfreeApiError(details.provider_message ?? 'Cashfree API returned non-success status', details);
    }

    if (!data.referenceId) {
      const details = {
        httpStatus,
        provider_status: data.status,
        provider_message: data.message,
        raw: data,
      };
      logger.error({ details }, 'Cashfree direct transfer missing referenceId');
      throw new CashfreeApiError('Cashfree API returned success without referenceId', details);
    }

    return data as CashfreeTransferSuccessResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const response = error.response;
      const details = {
        httpStatus: response?.status,
        provider_status: response?.data?.status,
        provider_sub_code: response?.data?.subCode,
        provider_message: response?.data?.message,
        raw: response?.data,
      };
      logger.error({ error: error.toJSON?.() ?? String(error), details }, 'Cashfree direct transfer HTTP error');
      throw new CashfreeApiError(details.provider_message ?? 'Cashfree API request failed', details);
    }

    logger.error({ error }, 'Cashfree direct transfer unexpected failure');
    throw error;
  }
}
