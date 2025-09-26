import express from 'express';
import { logger } from './utils/logger';
import { config } from './core/config';
import { routePayment } from './router/orchestrator';
import { RouteRequest } from './core/types';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/route', async (req, res) => {
  try {
    const response = await routePayment(req.body as RouteRequest);
    res.status(200).json(response);
  } catch (error) {
    logger.error({ error }, 'Routing failed');
    res.status(400).json({ error: (error as Error).message });
  }
});

const port = config.server.port;
app.listen(port, () => {
  logger.info({ port }, 'Main Seller Agent listening');
});

export default app;
