import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { EventEmitter } from 'node:events';
import { StorageManager } from '../kvstore';

// Load environment variables
dotenv.config();

const app = express();
const port = 3030;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Event bus for event-driven charges
const bus = new EventEmitter();

// Initialize kvstore for transaction tracking
const kvstore = new StorageManager();

// Import PayPal functions from events.ts
import {
  getAccessToken,
  createOrder,
  captureOrder,
  getOrder,
  getCapture,
  createSetupToken,
  getSetupToken,
  createPaymentTokenFromSetup,
  createOrderWithVaultId,
  extractApproveLink,
  printCapture
} from './events.js';

function rid() {
  return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation
app.get('/', (req, res) => {
  res.json({
    name: 'PayPal API Server with KVStore Integration',
    version: '1.0.0',
    endpoints: {
      // PayPal API
      'GET /health': 'Health check',
      'POST /orders': 'Create a new order (stores in kvstore)',
      'POST /orders/:id/capture': 'Capture an order (updates kvstore)',
      'GET /orders/:id': 'Get order details (syncs with kvstore)',
      'GET /captures/:id': 'Get capture details',
      'POST /vault/setup-tokens': 'Create setup token for vaulting',
      'GET /vault/setup-tokens/:id': 'Get setup token details',
      'POST /vault/payment-tokens': 'Create payment token from setup token',
      'POST /vault/charge': 'Charge using vaulted payment token',
      'POST /events/on': 'Set up event listener for automatic charging',
      'POST /events/emit': 'Emit an event to trigger charging',
      
      // KVStore API
      'GET /kvstore/health': 'KVStore health check',
      'GET /kvstore/stats': 'KVStore statistics',
      'GET /kvstore/counts': 'Transaction counts by status',
      'GET /kvstore/paypal/transactions': 'Get PayPal transactions',
      'GET /kvstore/paypal/transactions/:id': 'Get PayPal transaction by ID',
      'PATCH /kvstore/paypal/transactions/:id/status': 'Update transaction status',
      'PATCH /kvstore/paypal/transactions/:id/complete': 'Mark transaction as completed',
      'PATCH /kvstore/paypal/transactions/:id/fail': 'Mark transaction as failed',
      'DELETE /kvstore/paypal/transactions/:id': 'Delete transaction'
    }
  });
});

// Orders API
app.post('/orders', async (req, res) => {
  try {
    const { value, customerEmail, merchantId } = req.body;
    const currency = 'USD';
    const accessToken = await getAccessToken();
    const order = await createOrder({ value, currency }, accessToken);
    
    const approveLink = order.links?.find((l: { rel: string; }) => l.rel === 'approve')?.href ?? null;
    
    // Store transaction in kvstore using order ID as transaction ID
    try {
      await kvstore.createPaypalTransaction((order as any).id, {
        paypalOrderId: (order as any).id,
        amount: parseFloat(value),
        currency,
        merchantId,
        customerEmail,
        status: 'progress'
      });
      console.log(`📝 Stored PayPal transaction: ${(order as any).id} with status: progress`);
    } catch (kvError) {
      console.error('❌ Failed to store transaction in kvstore:', kvError);
      // Don't fail the order creation if kvstore fails
    }
    
    res.json({
      success: true,
      data: {
        id: (order as any).id,
        status: (order as any).status,
        approveLink,
        amount: { value, currency }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/orders/:id/capture', async (req, res) => {
  try {
    const { id } = req.params;
    const accessToken = await getAccessToken();
    const result = await captureOrder(id, accessToken);
    
    // Update transaction status in kvstore
    try {
      const existingTransaction = await kvstore.getPaypalTransaction(id);
      if (existingTransaction) {
        // Determine status based on capture result
        const status = (result as any).status === 'COMPLETED' ? 'completed' : 'failed';
        await kvstore.updatePaypalTransaction(id, {
          status,
          paypalTransactionId: (result as any).id || (result as any).purchase_units?.[0]?.payments?.captures?.[0]?.id
        });
        console.log(`📝 Updated PayPal transaction: ${id} with status: ${status}`);
      }
    } catch (kvError) {
      console.error('❌ Failed to update transaction in kvstore:', kvError);
      // Don't fail the capture if kvstore fails
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    // If capture fails, update transaction status to failed
    try {
      const { id } = req.params;
      await kvstore.updatePaypalStatus(id, 'failed');
      console.log(`📝 Marked PayPal transaction: ${id} as failed due to capture error`);
    } catch (kvError) {
      console.error('❌ Failed to update failed transaction in kvstore:', kvError);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const accessToken = await getAccessToken();
    const order = await getOrder(id, accessToken);
    
    // Update transaction status in kvstore based on order status
    try {
      const existingTransaction = await kvstore.getPaypalTransaction(id);
      if (existingTransaction) {
        let status = 'progress';
        if ((order as any).status === 'COMPLETED') {
          status = 'completed';
        } else if ((order as any).status === 'CANCELLED' || (order as any).status === 'FAILED') {
          status = 'failed';
        }
        
        // Only update if status has changed
        if (existingTransaction.status !== status) {
          await kvstore.updatePaypalStatus(id, status as any);
          console.log(`📝 Updated PayPal transaction: ${id} status from ${existingTransaction.status} to ${status}`);
        }
      }
    } catch (kvError) {
      console.error('❌ Failed to update transaction status in kvstore:', kvError);
      // Don't fail the order fetch if kvstore fails
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/captures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const accessToken = await getAccessToken();
    const capture = await getCapture(id, accessToken);
    
    res.json({
      success: true,
      data: capture
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Vault API
app.post('/vault/setup-tokens', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const setupToken = await createSetupToken(accessToken);
    
    const id = setupToken?.id;
    let approveLink = extractApproveLink(setupToken, id);
    
    if (!approveLink && id) {
      const fetched = await getSetupToken(id, accessToken);
      approveLink = extractApproveLink(fetched, id);
    }
    
    if (!approveLink) {
      throw new Error('No approval link (check Vault/eligibility)');
    }
    
    res.json({
      success: true,
      data: {
        id,
        approveLink,
        setupToken
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/vault/setup-tokens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const accessToken = await getAccessToken();
    const setupToken = await getSetupToken(id, accessToken);
    
    res.json({
      success: true,
      data: setupToken
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/vault/payment-tokens', async (req, res) => {
  try {
    const { setupTokenId, merchantCustomerId = 'user_123' } = req.body;
    
    if (!setupTokenId) {
      return res.status(400).json({
        success: false,
        error: 'setupTokenId is required'
      });
    }
    
    const accessToken = await getAccessToken();
    const paymentToken = await createPaymentTokenFromSetup(setupTokenId, accessToken);
    
    res.json({
      success: true,
      data: {
        id: paymentToken.id,
        paymentToken
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/vault/charge', async (req, res) => {
  try {
    const { paymentTokenId, amount = '2.00', currency = 'USD', customerEmail, merchantId } = req.body;
    
    if (!paymentTokenId) {
      return res.status(400).json({
        success: false,
        error: 'paymentTokenId is required'
      });
    }
    
    const accessToken = await getAccessToken();
    const order = await createOrderWithVaultId(amount, currency, paymentTokenId, accessToken);
    
    // Store transaction in kvstore using order ID as transaction ID
    try {
      await kvstore.createPaypalTransaction((order as any).id, {
        paypalOrderId: (order as any).id,
        amount: parseFloat(amount),
        currency,
        merchantId,
        customerEmail,
        status: 'progress'
      });
      console.log(`📝 Stored vault charge transaction: ${(order as any).id} with status: progress`);
    } catch (kvError) {
      console.error('❌ Failed to store vault charge transaction in kvstore:', kvError);
    }
    
    const captured = await captureOrder((order as any).id, accessToken);
    
    // Update transaction status based on capture result
    try {
      const status = (captured as any).status === 'COMPLETED' ? 'completed' : 'failed';
      await kvstore.updatePaypalTransaction((order as any).id, {
        status,
        paypalTransactionId: (captured as any).id || (captured as any).purchase_units?.[0]?.payments?.captures?.[0]?.id
      });
      console.log(`📝 Updated vault charge transaction: ${(order as any).id} with status: ${status}`);
    } catch (kvError) {
      console.error('❌ Failed to update vault charge transaction in kvstore:', kvError);
    }
    
    res.json({
      success: true,
      data: {
        order,
        capture: captured
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Event API
app.post('/events/on', async (req, res) => {
  try {
    const { eventName, paymentTokenId, amount, currency = 'USD' } = req.body;
    
    if (!eventName || !paymentTokenId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'eventName, paymentTokenId, and amount are required'
      });
    }
    
    // Set up event listener
    bus.on(eventName, async (payload: any = {}) => {
      try {
        const accessToken = await getAccessToken();
        const order = await createOrderWithVaultId(amount, currency, paymentTokenId, accessToken);
        console.log('🧾 Order created:', (order as any).id, (order as any).status);
        
        // Store transaction in kvstore
        try {
          await kvstore.createPaypalTransaction((order as any).id, {
            paypalOrderId: (order as any).id,
            amount: parseFloat(amount),
            currency,
            status: 'progress'
          });
          console.log(`📝 Stored event-driven transaction: ${(order as any).id}`);
        } catch (kvError) {
          console.error('❌ Failed to store event transaction in kvstore:', kvError);
        }
        
        const captured = await captureOrder((order as any).id, accessToken);
        
        // Update transaction status
        try {
          const status = (captured as any).status === 'COMPLETED' ? 'completed' : 'failed';
          await kvstore.updatePaypalTransaction((order as any).id, {
            status,
            paypalTransactionId: (captured as any).id || (captured as any).purchase_units?.[0]?.payments?.captures?.[0]?.id
          });
          console.log(`📝 Updated event transaction: ${(order as any).id} with status: ${status}`);
        } catch (kvError) {
          console.error('❌ Failed to update event transaction in kvstore:', kvError);
        }
        
        printCapture(captured);
      } catch (e: any) {
        console.error('❌ Charge error:', e.message);
      }
    });
    
    console.log(
      `👂 Listening for "${eventName}" -> charge ${amount} ${currency} with token ${paymentTokenId}`
    );
    
    res.json({
      success: true,
      message: `Event listener set up for "${eventName}"`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/events/emit', async (req, res) => {
  try {
    const { eventName, payload = {} } = req.body;
    
    if (!eventName) {
      return res.status(400).json({
        success: false,
        error: 'eventName is required'
      });
    }
    
    console.log('📣 Emitting', eventName, 'payload:', payload);
    bus.emit(eventName, payload);
    
    res.json({
      success: true,
      message: `Event "${eventName}" emitted successfully`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===============================
// KVSTORE ENDPOINTS
// ===============================

// KVStore health check
app.get('/kvstore/health', async (req, res) => {
  try {
    const health = await kvstore.healthCheck();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// KVStore statistics
app.get('/kvstore/stats', (req, res) => {
  try {
    const stats = kvstore.getStorageStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Transaction counts
app.get('/kvstore/counts', async (req, res) => {
  try {
    const counts = await kvstore.getTransactionCounts();
    res.json(counts);
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Get PayPal transactions
app.get('/kvstore/paypal/transactions', async (req, res) => {
  try {
    const { status } = req.query;
    
    if (status && !['progress', 'completed', 'failed'].includes(status as string)) {
      return res.status(400).json({ error: 'Invalid status. Must be progress, completed, or failed' });
    }
    
    let transactions;
    if (status) {
      transactions = await kvstore.getPaypalTransactionsByStatus(status as any);
    } else {
      // Get all PayPal transactions
      const paypalStorage = (kvstore as any).paypalStorage;
      const allIds = await paypalStorage.getAllTransactionIds();
      transactions = await Promise.all(
        allIds.map(id => kvstore.getPaypalTransaction(id))
      );
      transactions = transactions.filter(t => t !== null);
    }
    
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Get PayPal transaction by ID
app.get('/kvstore/paypal/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await kvstore.getPaypalTransaction(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Update PayPal transaction status
app.patch('/kvstore/paypal/transactions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['progress', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be progress, completed, or failed' });
    }
    
    const transaction = await kvstore.updatePaypalStatus(id, status as any);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Mark PayPal transaction as completed
app.patch('/kvstore/paypal/transactions/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await kvstore.markPaypalCompleted(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Mark PayPal transaction as failed
app.patch('/kvstore/paypal/transactions/:id/fail', async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await kvstore.markPaypalFailed(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Delete PayPal transaction
app.delete('/kvstore/paypal/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await kvstore.deletePaypalTransaction(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 PayPal API Server running on port ${port}`);
  console.log(`📖 API Documentation: http://localhost:${port}`);
  console.log(`🏥 Health Check: http://localhost:${port}/health`);
});

export default app;
