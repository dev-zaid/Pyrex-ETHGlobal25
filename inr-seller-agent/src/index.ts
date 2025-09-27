import express from 'express';
import { json } from 'body-parser';

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

  return res.json({ message: 'Endpoint scaffolded', order_id, amount: Number(amount) });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`[seller-agent] listening on port ${port}`);
});

export default app;
