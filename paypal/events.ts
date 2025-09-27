
import { EventEmitter } from 'node:events';

const API_BASE = 'https://api-m.sandbox.paypal.com';

// ---------- utils ----------
function assertEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
function rid() {
  return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now();
}
async function j(res: Response) {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

// ---------- auth ----------
export async function getAccessToken(): Promise<string> {
  const CLIENT_ID = assertEnv('PAYPAL_CLIENT_ID');
  const CLIENT_SECRET = assertEnv('PAYPAL_CLIENT_SECRET');
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await j(res) as { access_token: string };
  return data.access_token;
}

// ---------- VAULT: setup-token ----------
export async function createSetupToken(accessToken: string) {
  const res = await fetch(`${API_BASE}/v3/vault/setup-tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment_source: {
        paypal: {
          // REQUIRED to get approval UI
          usage_type: 'MERCHANT',
          experience_context: {
            brand_name: 'YourApp (Sandbox)',
            return_url: 'https://example.com/vault/return',
            cancel_url: 'https://example.com/vault/cancel',
          },
        },
      },
    }),
  });
  return j(res);
}

export async function getSetupToken(id: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/v3/vault/setup-tokens/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return j(res);
}

export function extractApproveLink(obj: any, setupTokenId: string | null = null) {
  const link = obj?.links?.find((l: any) => l.rel === 'approve')?.href;
  if (link) return link;
  // Fallback that works for setup-tokens (agreements flow)
  if (setupTokenId) {
    return `https://www.sandbox.paypal.com/agreements/approve?approval_session_id=${setupTokenId}`;
  }
  return '';
}

// ---------- VAULT: payment-token from setup-token ----------
export async function createPaymentTokenFromSetup(setupTokenId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/v3/vault/payment-tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment_source: { token: { id: setupTokenId, type: 'SETUP_TOKEN' } },
      customer: { merchant_customer_id: process.env.MERCHANT_CUSTOMER_ID ?? 'user_123' },
    }),
  });
  return j(res); // -> { id: '<PAYMENT_TOKEN_ID>', ... }
}

// ---------- ORDERS (charge vaulted token) ----------
export async function createOrderWithVaultId(
  amount: string,
  currency: string,
  paymentTokenId: string,
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': rid(), // REQUIRED when payment_source is present
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value: amount } }],
      payment_source: { paypal: { vault_id: paymentTokenId } },
    }),
  });
  return j(res);
}

export async function getOrder(orderId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return j(res);
}

export async function captureOrder(orderId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': rid(), // idempotent capture
      Prefer: 'return=representation',
    },
  });

  if (res.status === 422) {
    const err = await res.json() as any;
    if (err?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
      const order = await getOrder(orderId, accessToken);
      return { alreadyCaptured: true, order };
    }
    throw new Error(`422 ${JSON.stringify(err)}`);
  }
  return j(res);
}

export function printCapture(result: any) {
  if (result?.alreadyCaptured) {
    console.log('ℹ️ Order already captured. Original capture(s):');
    const caps = result.order?.purchase_units?.[0]?.payments?.captures ?? [];
    caps.forEach((c: any) =>
      console.log('—', c.id, c.status, `${c?.amount?.value} ${c?.amount?.currency_code}`),
    );
    return;
  }
  console.log('✅ Capture result for order:', result.id, result.status);
  const caps = result?.purchase_units?.[0]?.payments?.captures ?? [];
  caps.forEach((c: any) =>
    console.log('—', c.id, c.status, `${c?.amount?.value} ${c?.amount?.currency_code}`),
  );
}

// Additional functions from index.ts
export async function createOrder({ value = '20.00', currency = 'USD' }: { value: string; currency: string; }, accessToken: any) {
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

export async function getCapture(captureId: string, accessToken: any) {
  const res = await fetch(`${API_BASE}/v2/payments/captures/${captureId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get capture error ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------- Optional: event bus to trigger charges ----------
const bus = new EventEmitter();
function onEventCharge(eventName: string, paymentTokenId: string, amount: string, currency = 'USD') {
  bus.on(eventName, async (payload: any = {}) => {
    try {
      const at = await getAccessToken();
      const order = await createOrderWithVaultId(amount, currency, paymentTokenId, at) as any;
      console.log('🧾 Order created:', order.id, order.status);
      const captured = await captureOrder(order.id, at);
      printCapture(captured);
    } catch (e: any) {
      console.error('❌ Charge error:', e.message);
    }
  });
  console.log(
    `👂 Listening for "${eventName}" -> charge ${amount} ${currency} with token ${paymentTokenId}`,
  );
  console.log(`Emit with:
  bun run vault_paypal.ts emit ${eventName} '{"any":"payload"}'`);
}

// ---------- CLI ----------
async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  try {
    if (cmd === 'setup-token') {
      const at = await getAccessToken();
      const tok = await createSetupToken(at) as any;
      const id = tok?.id;
      let approve = extractApproveLink(tok, id);
      if (!approve && id) {
        const fetched = await getSetupToken(id, at);
        approve = extractApproveLink(fetched, id);
      }
      if (!approve) throw new Error('No approval link (check Vault/eligibility).');

      console.log('🆔 SETUP_TOKEN_ID:', id);
      console.log('👉 Approve as Sandbox BUYER (incognito):', approve);
      console.log('\nAfter approval run:\n  bun run vault_paypal.ts vault-finalize', id);
      return;
    }

    if (cmd === 'vault-finalize') {
      const [setupTokenId] = args;
      if (!setupTokenId) throw new Error('Usage: vault-finalize <SETUP_TOKEN_ID>');
      const at = await getAccessToken();
      const token = await createPaymentTokenFromSetup(setupTokenId, at) as any;
      console.log('✅ Payment token (vault_id):', token.id);
      console.log('Save this securely. Use it to charge:\n  bun run vault_paypal.ts charge', token.id, '2.00 USD');
      return;
    }

    if (cmd === 'charge') {
      const [paymentTokenId, amount = '2.00', currency = 'USD'] = args;
      if (!paymentTokenId) throw new Error('Usage: charge <PAYMENT_TOKEN_ID> [AMOUNT] [CURRENCY]');
      const at = await getAccessToken();
      const order = await createOrderWithVaultId(amount, currency, paymentTokenId, at) as any;
      console.log('🧾 Order created:', order.id, order.status);
      const captured = await captureOrder(order.id, at);
      printCapture(captured);
      return;
    }

    if (cmd === 'on') {
      const [eventName, paymentTokenId, amount, currency = 'USD'] = args;
      if (!eventName || !paymentTokenId || !amount)
        throw new Error('Usage: on <EVENT> <PAYMENT_TOKEN_ID> <AMOUNT> [CURRENCY]');
      onEventCharge(eventName, paymentTokenId, amount, currency);
      await new Promise(() => {}); // keep alive
      return;
    }

    if (cmd === 'emit') {
      const [eventName, json = '{}'] = args;
      if (!eventName) throw new Error('Usage: emit <EVENT> [JSON_PAYLOAD]');
      let payload: any = {};
      try { payload = JSON.parse(json); } catch {}
      console.log('📣 Emitting', eventName, 'payload:', payload);
      bus.emit(eventName, payload);
      return;
    }

    console.log(`Commands (VAULTED only):
  bun run vault_paypal.ts setup-token
  bun run vault_paypal.ts vault-finalize <SETUP_TOKEN_ID>
  bun run vault_paypal.ts charge <PAYMENT_TOKEN_ID> [AMOUNT] [CURRENCY]
  bun run vault_paypal.ts on <EVENT> <PAYMENT_TOKEN_ID> <AMOUNT> [CURRENCY]
  bun run vault_paypal.ts emit <EVENT> [JSON_PAYLOAD]`);
  } catch (e: any) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

main();
