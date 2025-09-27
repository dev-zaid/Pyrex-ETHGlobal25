import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { logger } from './utils/logger';
import { scheduleFulfillment } from './services/orderProcessor';

const app = express();
app.use(cors());
app.use(json());

app.post('/fulfill-order', async (req, res) => {
  const { order_id, amount } = req.body ?? {};

  if (!order_id || typeof order_id !== 'string') {
    return res.status(400).json({ error: 'order_id is required' });
  }
  try {
    let expectedAmount: number | undefined;
    if (amount !== undefined) {
      const parsed = Number(amount);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ error: 'amount must be numeric when provided' });
      }
      expectedAmount = parsed;
    }

    const result = await scheduleFulfillment({ orderId: order_id, expectedAmount });
    return res.json({
      audit_id: `order-${result.reservationId}`,
      reservation_id: result.reservationId,
      fulfilled_amount: result.amount,
      cashfree: result.cashfree,
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.error({ error }, 'Order fulfillment failed');
    const status = message === 'Cashfree transaction failed' ? 502 : 400;
    return res.status(status).json({ error: message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`[seller-agent] listening on port ${port}`);
});

export default app;
