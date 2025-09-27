const API_BASE = 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const creds = `AdFASTYZVuQHbeVsjNv0C_2ed9KnOF_HZLJNeFTAboyxC_vpjmJRMZaUhs3jNEl9_D4jbKUuf1G4ssqU:EJGHtGXj0f6whqRglv-ISM4NuqpCUpz-2NKGhirfj10aVxNV0X2BORbyiQ-h-FPVcvdcwO8mH9KY2yEn`;
  const auth = Buffer.from(creds).toString('base64');

  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token error ${res.status}: ${text}`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function createOrder({ value = '20.00', currency = 'USD' }: { value: string; currency: string; }, accessToken: any) {
  const res = await fetch(`${API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value } }],
      application_context: {
        return_url: 'https://example.com/return',
        cancel_url: 'https://example.com/cancel'
      }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create order error ${res.status}: ${text}`);
  }
  return res.json();
}

async function captureOrder(orderId: string, accessToken: any) {
  const res = await fetch(`${API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Capture error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getOrder(orderId: string, accessToken: any) {
  const res = await fetch(`${API_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get order error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getCapture(captureId: string, accessToken: any) {
  const res = await fetch(`${API_BASE}/v2/payments/captures/${captureId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get capture error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * CLI usage:
 *   node paypal_sandbox.js create 20.00 USD
 *   node paypal_sandbox.js capture <ORDER_ID>
 *   node paypal_sandbox.js order <ORDER_ID>
 *   node paypal_sandbox.js capture-status <CAPTURE_ID>
 */
async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.log(`Usage:
  node paypal_sandbox.js create [amount] [currency]
  node paypal_sandbox.js capture <ORDER_ID>
  node paypal_sandbox.js order <ORDER_ID>
  node paypal_sandbox.js capture-status <CAPTURE_ID>`);
    process.exit(0);
  }

  try {
    const accessToken = await getAccessToken();

    if (cmd === 'create') {
      const [amount = '20.00', currency = 'USD'] = args;
      const order = await createOrder({ value: amount, currency }, accessToken);

      const approveLink =
        order.links?.find((l: { rel: string; }) => l.rel === 'approve')?.href ?? '(not found)';
      console.log('Order created ✅');
      console.log('Order ID:', order.id);
      console.log('Status  :', order.status);
      console.log('Approve :', approveLink);
      console.log('\nNext step: Open the approve link in a browser, log in with a Sandbox BUYER account, approve the payment, then run:');
      console.log(`node paypal_sandbox.js capture ${order.id}`);
    }

    else if (cmd === 'capture') {
      const [orderId] = args;
      if (!orderId) throw new Error('ORDER_ID is required');
      const result = await captureOrder(orderId, accessToken);

      console.log('Order captured ✅');
      console.log('Order ID:', result.id);
      console.log('Status  :', result.status);

      const captures = result?.purchase_units?.[0]?.payments?.captures ?? [];
      for (const c of captures) {
        console.log('— Capture ID:', c.id);
        console.log('  Capture Status:', c.status);
        console.log('  Amount:', `${c?.amount?.value} ${c?.amount?.currency_code}`);
      }
      if (captures[0]?.id) {
        console.log('\nTo check capture status later:');
        console.log(`node paypal_sandbox.js capture-status ${captures[0].id}`);
      }
    }

    else if (cmd === 'order') {
      const [orderId] = args;
      if (!orderId) throw new Error('ORDER_ID is required');
      const data = await getOrder(orderId, accessToken);
      console.log(JSON.stringify(data, null, 2));
    }

    else if (cmd === 'capture-status') {
      const [captureId] = args;
      if (!captureId) throw new Error('CAPTURE_ID is required');
      const data = await getCapture(captureId, accessToken);
      console.log(JSON.stringify(data, null, 2));
    }

    else {
      throw new Error(`Unknown command: ${cmd}`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
