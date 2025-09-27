import { OrderService } from '../src/orderService';
import { OrderRequest } from '../src/types';

// Mock the API client
jest.mock('../src/apiClient', () => ({
  MainAgentApiClient: jest.fn().mockImplementation(() => ({
    routeOrder: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue(true),
  })),
}));

describe('OrderService', () => {
  let orderService: OrderService;
  let mockApiClient: any;

  beforeEach(() => {
    orderService = new OrderService();
    mockApiClient = (orderService as any).apiClient;
  });

  describe('triggerOrder', () => {
    it('should successfully trigger an order', async () => {
      const mockResponse = {
        audit_id: 'test-audit-id',
        matched_offers: [],
        totals: {
          total_pyusd: 100,
          total_inr_estimated: 8300,
          weighted_latency_ms: 5000,
        },
        onchain_transfers: [],
        seller_payouts: [],
      };

      mockApiClient.routeOrder.mockResolvedValue(mockResponse);

      const orderRequest: OrderRequest = {
        target_pyusd: "250",
        constraints: {
          max_latency_ms: 20000,
          max_fee_pct: 0.03
        },
        payment_context: {
          chain: "polygon",
          payer: "0x1234567890abcdef",
          tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
        }
      };

      const result = await orderService.triggerOrder(orderRequest);

      expect(result.status).toBe('completed');
      expect(result.response).toEqual(mockResponse);
      expect(result.target_pyusd).toBe("250");
      expect(result.payer).toBe("0x1234567890abcdef");
    });

    it('should handle API failures', async () => {
      const errorMessage = 'API Error';
      mockApiClient.routeOrder.mockRejectedValue(new Error(errorMessage));

      const orderRequest: OrderRequest = {
        target_pyusd: "250",
        constraints: {
          max_latency_ms: 20000,
          max_fee_pct: 0.03
        },
        payment_context: {
          chain: "polygon",
          payer: "0x1234567890abcdef",
          tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
        }
      };

      await expect(orderService.triggerOrder(orderRequest)).rejects.toThrow(errorMessage);

      const order = orderService.getOrderStatus('any-id');
      expect(order?.status).toBe('failed');
      expect(order?.error).toBe(errorMessage);
    });
  });

  describe('order management', () => {
    it('should track orders correctly', async () => {
      const mockResponse = {
        audit_id: 'test-audit-id',
        matched_offers: [],
        totals: { total_pyusd: 50, total_inr_estimated: 4150, weighted_latency_ms: 5000 },
        onchain_transfers: [],
        seller_payouts: [],
      };

      mockApiClient.routeOrder.mockResolvedValue(mockResponse);

      const orderRequest: OrderRequest = {
        target_pyusd: "100",
        constraints: {
          max_latency_ms: 15000,
          max_fee_pct: 0.025
        },
        payment_context: {
          chain: "polygon",
          payer: "0x1234567890abcdef",
          tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
        }
      };

      const result = await orderService.triggerOrder(orderRequest);
      const retrievedOrder = orderService.getOrderStatus(result.id);

      expect(retrievedOrder).toEqual(result);
      expect(orderService.getAllOrders()).toHaveLength(1);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      mockApiClient.healthCheck.mockResolvedValue(true);

      const health = await orderService.healthCheck();

      expect(health.status).toBe('ok');
      expect(health.mainAgentHealth).toBe(true);
      expect(typeof health.activeOrders).toBe('number');
    });
  });
});
