import axios from 'axios';
import { createDemoPaymentPayload, encodePaymentPayload } from './payment';
import dotenv from 'dotenv';
dotenv.config();


export async function sendMessage(serviceUrl: string, skill: string, input: any) {
  const client = axios.create({ baseURL: serviceUrl, timeout: 15000 });
  const payload = { jsonrpc: '2.0', id: 1, method: 'message/send', params: { skill, input } };
  // First call without payment
  try {
    const resp = await client.post('/a2a', payload);
    if (resp.data && resp.data.error && resp.data.error.code === 402) {
      // Got payment required info from service agent
      const accepts = resp.data.error.data?.accepts || resp.data.error.data?.accepts;
      const successPayload = resp.data.error.data?.successPayload;


let PRIVATE_KEY_ADDRESS='0xCA3953e536bDA86D1F152eEfA8aC7b0C82b6eC00'
      
      // Verify success status and acknowledged=1 before proceeding with payment
      if (successPayload) {
        console.log('Received success payload:', JSON.stringify(successPayload, null, 2));
        
        if (successPayload.status === 'SUCCESS' && 
            successPayload.subCode === '200' && 
            successPayload.data?.acknowledged === 1) {
          console.log('✅ Success verification passed - proceeding with payment');
        } else {
          console.log('❌ Success verification failed - aborting payment');
          throw new Error(`Payment aborted: Invalid success payload. Status: ${successPayload.status}, SubCode: ${successPayload.subCode}, Acknowledged: ${successPayload.data?.acknowledged}`);
        }
      } else {
        console.log('⚠️ No success payload received - proceeding with payment anyway');
      }
      
      // For simplicity, pick first accepts and create a payment payload
      const first = Array.isArray(accepts) ? accepts[0] : accepts;
      const value = input?.amount || first?.maxAmountRequired || '10000';
      const payment = await createDemoPaymentPayload(PRIVATE_KEY_ADDRESS || '0xPayer', first.payTo, value, first.asset || '0xVerifier');
      const b64 = encodePaymentPayload(payment);
      // Retry initial resource call by sending to service agent with X-PAYMENT header (service will forward)
      const retryResp = await client.post('/a2a', payload, { headers: { 'X-PAYMENT': b64 } });
      return retryResp.data;
    }
    return resp.data;
  } catch (e: any) {
    throw e;
  }
}
