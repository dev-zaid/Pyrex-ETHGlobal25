import axios from 'axios';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { CashfreeApiError, CashfreeAuthError } from '../errors';
import { getCashfreeBearerToken, invalidateCashfreeToken } from './cashfreeAuth';

const CASHFREE_BASE_URL = getEnv('CASHFREE_BASE_URL', 'https://payout-gamma.cashfree.com');

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
  status: string;
  subCode?: string;
  message?: string;
  data?: {
    referenceId?: string;
    utr?: string;
    acknowledged?: number;
    [key: string]: unknown;
  };
}

export interface CashfreeTransferSuccessResponse {
  referenceId: string;
  status: string;
  utr?: string;
  acknowledged?: boolean;
  raw: CashfreeTransferResponse;
}

const client = axios.create({
  baseURL: `${CASHFREE_BASE_URL}/payout/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function createDirectTransfer(
  request: CashfreeTransferRequest,
): Promise<CashfreeTransferSuccessResponse> {
  logger.info({ request }, 'Initiating Cashfree direct transfer');

  try {
    const bearer = await getCashfreeBearerToken();
    const response = await client.post<CashfreeTransferResponse>('/directTransfer', request, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    const { data, status: httpStatus } = response;

    if (!data || data.status !== 'SUCCESS') {
      const details = {
        httpStatus,
        provider_status: data?.status,
        provider_sub_code: data?.subCode,
        provider_message: data?.message,
        raw: data,
      };
      if (details.httpStatus === 401 || details.httpStatus === 403) {
        invalidateCashfreeToken();
      }
      logger.error({ details }, 'Cashfree direct transfer returned non-success status');
      throw new CashfreeApiError(details.provider_message ?? 'Cashfree API returned non-success status', details);
    }

    const referenceId = data.data?.referenceId;
    if (!referenceId) {
      const details = {
        httpStatus,
        provider_status: data.status,
        provider_message: data.message,
        raw: data,
      };
      logger.error({ details }, 'Cashfree direct transfer missing referenceId');
      throw new CashfreeApiError('Cashfree API success missing referenceId', details);
    }

    return {
      referenceId,
      status: data.status,
      utr: data.data?.utr,
      acknowledged: data.data?.acknowledged === 1,
      raw: data,
    };
  } catch (error) {
    if (error instanceof CashfreeAuthError) {
      logger.error({ details: error.details }, 'Cashfree bearer token fetch failed');
      throw error;
    }
    if (axios.isAxiosError(error)) {
      const response = error.response;
      const details = {
        httpStatus: response?.status,
        provider_status: response?.data?.status,
        provider_sub_code: response?.data?.subCode,
        provider_message: response?.data?.message,
        raw: response?.data,
      };
      if (details.httpStatus === 401 || details.httpStatus === 403) {
        invalidateCashfreeToken();
      }
      logger.error({ error: error.toJSON?.() ?? String(error), details }, 'Cashfree direct transfer HTTP error');
      throw new CashfreeApiError(details.provider_message ?? 'Cashfree API request failed', details);
    }

    logger.error({ error }, 'Cashfree direct transfer unexpected failure');
    throw error;
  }
}
