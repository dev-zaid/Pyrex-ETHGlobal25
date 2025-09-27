import express from 'express';
import { json } from 'body-parser';
import { logger } from './utils/logger';
import { fulfillOrder } from './services/fulfillmentService';

const app = express();
app.use(json());

app.post('/fulfill-order', async (req, res) => {
  const { order_id, amount } = req.body ?? {};

  if (!order_id || typeof order_id !== 'string') {
    return res.status(400).json({ error: 'order_id is required' });
  }
  if (amount === undefined || Number.isNaN(Number(amount))) {
    return res.status(400).json({ error: 'amount is required' });
  }

  try {
    const parsedAmount = Number(amount);
    const result = await fulfillOrder({ orderId: order_id, amount: parsedAmount });
    return res.json({
      audit_id: `order-${result.reservationId}`,
      reservation_id: result.reservationId,
      requested_amount: parsedAmount,
      razorpay: result.razorpay,
    });
  } catch (error) {
    logger.error({ error }, 'Reservation validation failed');
    return res.status(400).json({ error: (error as Error).message });
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
