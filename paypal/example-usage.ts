#!/usr/bin/env bun

/**
 * Example usage of the PayPal API Server
 * This script demonstrates how to interact with the API endpoints
 */

const API_BASE = 'http://localhost:3000';

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
  }
  
  return data;
}

async function exampleBasicOrder() {
  console.log('🛒 Creating a basic order...');
  
  try {
    const result = await makeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        value: '25.00',
        currency: 'USD'
      })
    });
    
    console.log('✅ Order created:', result.data);
    return result.data.id;
  } catch (error: any) {
    console.error('❌ Error creating order:', error.message);
    throw error;
  }
}

async function exampleCaptureOrder(orderId: string) {
  console.log(`💳 Capturing order ${orderId}...`);
  
  try {
    const result = await makeRequest(`/orders/${orderId}/capture`, {
      method: 'POST'
    });
    
    console.log('✅ Order captured:', result.data);
    return result.data;
  } catch (error: any) {
    console.error('❌ Error capturing order:', error.message);
    throw error;
  }
}

async function exampleVaultFlow() {
  console.log('🔐 Starting vault flow...');
  
  try {
    // Step 1: Create setup token
    console.log('1. Creating setup token...');
    const setupResult = await makeRequest('/vault/setup-tokens', {
      method: 'POST'
    });
    
    console.log('✅ Setup token created:', setupResult.data);
    console.log('👉 Please approve the payment method at:', setupResult.data.approveLink);
    console.log('   (This would normally be done by the user in their browser)');
    
    // In a real scenario, you'd wait for user approval here
    // For this example, we'll assume the user has approved
    const setupTokenId = setupResult.data.id;
    
    // Step 2: Create payment token (this would normally be done after user approval)
    console.log('2. Creating payment token...');
    const paymentResult = await makeRequest('/vault/payment-tokens', {
      method: 'POST',
      body: JSON.stringify({
        setupTokenId: setupTokenId
      })
    });
    
    console.log('✅ Payment token created:', paymentResult.data);
    const paymentTokenId = paymentResult.data.id;
    
    // Step 3: Charge using the vaulted payment method
    console.log('3. Charging using vaulted payment method...');
    const chargeResult = await makeRequest('/vault/charge', {
      method: 'POST',
      body: JSON.stringify({
        paymentTokenId: paymentTokenId,
        amount: '15.00',
        currency: 'USD'
      })
    });
    
    console.log('✅ Charge successful:', chargeResult.data);
    return paymentTokenId;
  } catch (error: any) {
    console.error('❌ Error in vault flow:', error.message);
    throw error;
  }
}

async function exampleEventDrivenCharging(paymentTokenId: string) {
  console.log('📡 Setting up event-driven charging...');
  
  try {
    // Set up event listener
    await makeRequest('/events/on', {
      method: 'POST',
      body: JSON.stringify({
        eventName: 'monthly-subscription',
        paymentTokenId: paymentTokenId,
        amount: '29.99',
        currency: 'USD'
      })
    });
    
    console.log('✅ Event listener set up for "monthly-subscription"');
    
    // Emit event to trigger charge
    console.log('📤 Emitting event to trigger charge...');
    await makeRequest('/events/emit', {
      method: 'POST',
      body: JSON.stringify({
        eventName: 'monthly-subscription',
        payload: { userId: '123', plan: 'premium' }
      })
    });
    
    console.log('✅ Event emitted successfully');
  } catch (error: any) {
    console.error('❌ Error in event-driven charging:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 PayPal API Server Example Usage\n');
  
  try {
    // Check if server is running
    console.log('🏥 Checking server health...');
    const health = await makeRequest('/health');
    console.log('✅ Server is healthy:', health);
    console.log('');
    
    // Example 1: Basic order flow
    console.log('=== Example 1: Basic Order Flow ===');
    const orderId = await exampleBasicOrder();
    console.log('');
    
    // Note: In a real scenario, the user would approve the payment
    // For this example, we'll skip the capture since it requires user interaction
    console.log('ℹ️  Note: Order capture requires user approval in PayPal sandbox');
    console.log('   You can capture it manually using:');
    console.log(`   curl -X POST ${API_BASE}/orders/${orderId}/capture`);
    console.log('');
    
    // Example 2: Vault flow (commented out as it requires user interaction)
    console.log('=== Example 2: Vault Flow ===');
    console.log('ℹ️  Vault flow requires user interaction for approval');
    console.log('   You can test it manually using the API endpoints');
    console.log('');
    
    // Example 3: Event-driven charging (commented out as it requires vault setup)
    console.log('=== Example 3: Event-driven Charging ===');
    console.log('ℹ️  Event-driven charging requires a vaulted payment method');
    console.log('   You can test it after setting up vault flow');
    console.log('');
    
    console.log('🎉 Example completed! Check the server logs for detailed information.');
    
  } catch (error: any) {
    console.error('💥 Example failed:', error.message);
    process.exit(1);
  }
}

// Run the example
if (import.meta.main) {
  main();
}
