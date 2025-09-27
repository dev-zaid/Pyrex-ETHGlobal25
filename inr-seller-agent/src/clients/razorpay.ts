import axios from 'axios';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

const RAZORPAY_BASE_URL = getEnv('RAZORPAY_BASE_URL', 'https://api.razorpay.com/v1');
const RAZORPAY_KEY_ID = getEnv('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = getEnv('RAZORPAY_KEY_SECRET');

const client = axios.create({
  baseURL: RAZORPAY_BASE_URL,
  auth: {
    username: RAZORPAY_KEY_ID,
    password: RAZORPAY_KEY_SECRET,
  },
  timeout: 10000,
});

export interface RazorpayPaymentRequest {
  amount: number;
  currency: string;
  upi: {
    vpa: string;
  };
  reference_id: string;
}

export interface RazorpayPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
}

export async function createUpiPayment(request: RazorpayPaymentRequest): Promise<RazorpayPaymentResponse> {
  logger.info({ request }, 'Initiating Razorpay UPI payment');
  const { data } = await client.post<RazorpayPaymentResponse>('/payments', request);
  return data;
}
