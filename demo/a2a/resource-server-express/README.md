# Resource Server (Express) - demo implementation

Exposes POST /premium/summarize which is protected by a simple x402 flow: returns 402 with PaymentRequirements when no X-PAYMENT header, verifies payment with Facilitator, processes request, and then calls /settle.

Environment variables:
- ADDRESS: payTo address
- FACILITATOR_URL: URL of local facilitator (default http://localhost:5401)
- AMOY_PYUSD_ADDRESS: token address

To run (dev):
- install deps and run `pnpm --filter demo/a2a/resource-server-express dev` from the repo root (or run ts-node-esm directly)

