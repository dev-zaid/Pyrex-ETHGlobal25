import express from 'express';
import { OrderService } from './orderService';
import { config } from './config';
import { logger } from './logger';
import { TriggerRequest } from './types';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Initialize the order service
const orderService = new OrderService();

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const health = await orderService.healthCheck();
    res.status(200).json(health);
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(500).json({ 
      status: 'error', 
      error: (error as Error).message 
    });
  }
});

// Trigger USD order endpoint
app.post('/trigger-order', async (req, res) => {
  try {
    const triggerRequest: TriggerRequest = req.body;

    // Validate required fields
    if (!triggerRequest.target_pyusd || !triggerRequest.vendor_upi) {
      return res.status(400).json({
        error: 'Missing required fields: target_pyusd and vendor_upi are required'
      });
    }

    if (parseFloat(triggerRequest.target_pyusd) <= 0) {
      return res.status(400).json({
        error: 'target_pyusd must be greater than 0'
      });
    }

    logger.info(
      { 
        targetPyusd: triggerRequest.target_pyusd, 
        vendorUpi: triggerRequest.vendor_upi
      },
      'Received order trigger request'
    );

    const orderTrigger = await orderService.triggerOrder(triggerRequest);
    res.status(200).json(orderTrigger);

  } catch (error) {
    logger.error({ error }, 'Order trigger failed');
    res.status(500).json({ 
      error: (error as Error).message 
    });
  }
});

// Get order status endpoint
app.get('/order/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = orderService.getOrderStatus(orderId);

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    res.status(200).json(order);
  } catch (error) {
    logger.error({ error }, 'Failed to get order status');
    res.status(500).json({ 
      error: (error as Error).message 
    });
  }
});

// Get all orders endpoint
app.get('/orders', (req, res) => {
  try {
    const { status } = req.query;
    
    let orders;
    if (status) {
      orders = orderService.getOrdersByStatus(status as any);
    } else {
      orders = orderService.getAllOrders();
    }

    res.status(200).json({
      orders,
      count: orders.length
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get orders');
    res.status(500).json({ 
      error: (error as Error).message 
    });
  }
});

// Cleanup old orders endpoint
app.post('/cleanup', (req, res) => {
  try {
    const { hoursOld = 24 } = req.body;
    orderService.cleanupOldOrders(hoursOld);
    res.status(200).json({ 
      message: 'Cleanup completed',
      hoursOld 
    });
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup orders');
    res.status(500).json({ 
      error: (error as Error).message 
    });
  }
});

// Start the server
const port = config.port;
app.listen(port, () => {
  logger.info({ port }, 'Main Agent Service listening');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
