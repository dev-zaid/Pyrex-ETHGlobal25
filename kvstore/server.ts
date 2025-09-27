import express, { Request, Response } from 'express';
import { StorageManager, TransactionStatus } from './index';

const app = express();
const PORT = 3031;

// Middleware
app.use(express.json());

// Initialize storage manager
const storage = new StorageManager();

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await storage.healthCheck();
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Statistics endpoint
app.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = storage.getStorageStats();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Transaction counts endpoint
app.get('/counts', async (req: Request, res: Response) => {
  try {
    const counts = await storage.getTransactionCounts();
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===============================
// UPI TRANSACTION ENDPOINTS
// ===============================

// Create UPI transaction
app.post('/upi/transactions', async (req: Request, res: Response) => {
  try {
    const { txnId, ...transactionData } = req.body;

    if (!txnId) {
      return res.status(400).json({ error: 'txnId is required' });
    }

    // Check if transaction already exists
    const existing = await storage.getUpiTransaction(txnId);
    if (existing) {
      return res.status(409).json({ error: 'Transaction already exists' });
    }

    const transaction = await storage.createUpiTransaction(txnId, transactionData);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get UPI transaction by ID
app.get('/upi/transactions/:txnId', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.getUpiTransaction(txnId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update UPI transaction
app.put('/upi/transactions/:txnId', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const updates = req.body;

    const transaction = await storage.updateUpiTransaction(txnId, updates);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update UPI transaction status
app.patch('/upi/transactions/:txnId/status', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const { status } = req.body;

    if (!status || !['progress', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be progress, completed, or failed' });
    }

    const transaction = await storage.updateUpiStatus(txnId, status as TransactionStatus);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mark UPI transaction as completed
app.patch('/upi/transactions/:txnId/complete', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.markUpiCompleted(txnId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mark UPI transaction as failed
app.patch('/upi/transactions/:txnId/fail', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.markUpiFailed(txnId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get UPI transactions by status
app.get('/upi/transactions', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    if (status && !['progress', 'completed', 'failed'].includes(status as string)) {
      return res.status(400).json({ error: 'Invalid status. Must be progress, completed, or failed' });
    }

    let transactions;
    if (status) {
      transactions = await storage.getUpiTransactionsByStatus(status as TransactionStatus);
    } else {
      // Get all UPI transactions by getting all IDs and fetching them
      const upiStorage = (storage as any).upiStorage;
      const allIds = await upiStorage.getAllTransactionIds();
      transactions = await Promise.all(
        allIds.map(id => storage.getUpiTransaction(id))
      );
      transactions = transactions.filter(t => t !== null);
    }

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete UPI transaction
app.delete('/upi/transactions/:txnId', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const deleted = await storage.deleteUpiTransaction(txnId);

    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===============================
// PAYPAL TRANSACTION ENDPOINTS
// ===============================

// Create PayPal transaction
app.post('/paypal/transactions', async (req: Request, res: Response) => {
  try {
    const { txnId, ...transactionData } = req.body;

    if (!txnId) {
      return res.status(400).json({ error: 'txnId is required' });
    }

    // Check if transaction already exists
    const existing = await storage.getPaypalTransaction(txnId);
    if (existing) {
      return res.status(409).json({ error: 'Transaction already exists' });
    }

    const transaction = await storage.createPaypalTransaction(txnId, transactionData);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get PayPal transaction by ID
app.get('/paypal/transactions/:txnId', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.getPaypalTransaction(txnId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update PayPal transaction
app.put('/paypal/transactions/:txnId', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const updates = req.body;

    const transaction = await storage.updatePaypalTransaction(txnId, updates);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update PayPal transaction status
app.patch('/paypal/transactions/:txnId/status', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const { status } = req.body;

    if (!status || !['progress', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be progress, completed, or failed' });
    }

    const transaction = await storage.updatePaypalStatus(txnId, status as TransactionStatus);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mark PayPal transaction as completed
app.patch('/paypal/transactions/:txnId/complete', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.markPaypalCompleted(txnId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mark PayPal transaction as failed
app.patch('/paypal/transactions/:txnId/fail', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.markPaypalFailed(txnId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get PayPal transactions by status
app.get('/paypal/transactions', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    if (status && !['progress', 'completed', 'failed'].includes(status as string)) {
      return res.status(400).json({ error: 'Invalid status. Must be progress, completed, or failed' });
    }

    let transactions;
    if (status) {
      transactions = await storage.getPaypalTransactionsByStatus(status as TransactionStatus);
    } else {
      // Get all PayPal transactions by getting all IDs and fetching them
      const paypalStorage = (storage as any).paypalStorage;
      const allIds = await paypalStorage.getAllTransactionIds();
      transactions = await Promise.all(
        allIds.map(id => storage.getPaypalTransaction(id))
      );
      transactions = transactions.filter(t => t !== null);
    }

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get PayPal transaction by Order ID
app.get('/paypal/transactions/by-order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const transaction = await storage.getPaypalTransactionByOrderId(orderId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get PayPal transaction by Transaction ID
app.get('/paypal/transactions/by-txn/:txnId', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.getPaypalTransactionByTransactionId(txnId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete PayPal transaction
app.delete('/paypal/transactions/:txnId', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const deleted = await storage.deletePaypalTransaction(txnId);

    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===============================
// COMBINED ENDPOINTS
// ===============================

// Get all transactions by status (both UPI and PayPal)
app.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    if (!status || !['progress', 'completed', 'failed'].includes(status as string)) {
      return res.status(400).json({ error: 'Invalid status. Must be progress, completed, or failed' });
    }

    const transactions = await storage.getAllTransactionsByStatus(status as TransactionStatus);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear all transactions (dangerous operation)
app.delete('/transactions', async (req: Request, res: Response) => {
  try {
    await storage.clearAllTransactions();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`KVStore server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API docs: See README.md for endpoint documentation`);
  });
}

export default app;
