import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { buildPaymentRequirements, verifyPayment, settlePayment } from './x402.js';
import { summarize } from './premium/summarize.js';

const app = express();
app.use(cors({ exposedHeaders: ['X-PAYMENT-RESPONSE'] }));
app.use(bodyParser.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 5403;
const ADDRESS = process.env.ADDRESS || '0xPayToAddress';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:5401';
const AMOY_PYUSD_ADDRESS = process.env.AMOY_PYUSD_ADDRESS || '0xAmoyPYUSD';

app.post('/premium/summarize', async (req: any, res: any) => {
  const paymentHeader = req.headers['x-payment'] as string | undefined;
  const { orderId, amount } = req.body || {};
  
  // If no payment header, return 402 with accepts and success payload
  if (!paymentHeader) {
    const resourceUrl = `http://localhost:${PORT}/premium/summarize`;
    const accepts = [buildPaymentRequirements(resourceUrl, ADDRESS, AMOY_PYUSD_ADDRESS)];
    
    // Generate success payload with orderId and amount
    const successPayload = {
      status: "SUCCESS",
      subCode: "200",
      message: "Transfer completed successfully",
      data: {
        referenceId: orderId || "662542057",
        utr: "1758964188808195",
        acknowledged: 1
      }
    };
    
    console.log(`Processing order ${orderId} with amount ${amount}`);
    console.log('Returning 402 with success payload:', JSON.stringify(successPayload, null, 2));
    
    return res.status(402).json({ 
      accepts,
      successPayload 
    });
  }

  // Verify via facilitator
  try {
    console.log('Verifying payment with facilitator...');
    const verify = await verifyPayment(paymentHeader);
    console.log('Verification result:', JSON.stringify(verify, null, 2));
    
    if (!verify || !verify.success) {
      console.log('❌ Payment verification failed');
      return res.status(402).json({ error: 'payment_verification_failed', details: verify });
    }
    
    console.log('✅ Payment verification successful');
  } catch (e) {
    console.log('❌ Facilitator unreachable:', String(e));
    return res.status(502).json({ error: 'facilitator_unreachable', details: String(e) });
  }

  // Process request
  const result = await summarize(req.body || {});

  // Settle via facilitator (best-effort)
  try {
    const settle = await settlePayment(paymentHeader);
    // Try to read facilitator response and create X-PAYMENT-RESPONSE
    const resp = settle.data || {};
    const responsePayload = { success: !!resp.success, transaction: resp.transaction || null, network: 'polygon-amoy', payer: resp.payer || null };
    const b64 = Buffer.from(JSON.stringify(responsePayload)).toString('base64');
    res.setHeader('X-PAYMENT-RESPONSE', b64);
  } catch (e) {
    // If settle failed, continue but include header with error
    const errPayload = { success: false, error: String(e) };
    const b64 = Buffer.from(JSON.stringify(errPayload)).toString('base64');
    res.setHeader('X-PAYMENT-RESPONSE', b64);
  }

  res.json({ result });
});

app.get('/healthz', (_req: any, res: any) => res.json({ ok: true, facilitator: FACILITATOR_URL }));

app.listen(PORT, () => {
  console.log(`Resource server listening on port ${PORT}`);
  console.log(`Facilitator: ${FACILITATOR_URL}`);
});
