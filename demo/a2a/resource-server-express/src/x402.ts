import axios from 'axios';
import { PaymentRequirements } from './types.js';

const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:5401';

export function buildPaymentRequirements(resourceUrl: string, payTo: string, asset: string): PaymentRequirements {
  return {
    scheme: 'exact',
    network: 'polygon-amoy',
    resource: resourceUrl,
    description: 'Premium summarization',
    mimeType: 'application/json',
    payTo,
    maxAmountRequired: '100000',
    maxTimeoutSeconds: 120,
    asset,
    extra: { name: 'PYUSD', version: '2' },
    outputSchema: { input: { type: 'http', method: 'POST' }, output: {} }
  };
}

export async function verifyPayment(paymentPayloadBase64: string) {
  const url = `${FACILITATOR_URL}/verify`;
  try {
    const resp = await axios.post(url, { paymentPayloadBase64 }, { timeout: 10_000 });
    return resp.data;
  } catch (err: any) {
    if (err.response) return err.response.data;
    throw err;
  }
}

export async function settlePayment(paymentPayloadBase64: string) {
  const url = `${FACILITATOR_URL}/settle`;
  try {
    const resp = await axios.post(url, { paymentPayloadBase64 }, { timeout: 30_000 });
    return { data: resp.data, headers: resp.headers };
  } catch (err: any) {
    if (err.response) return { data: err.response.data, headers: err.response.headers };
    throw err;
  }
}
