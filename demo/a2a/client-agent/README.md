# Client Agent (A2A client) - demo implementation

Sends a `message/send` JSON-RPC to the service agent; handles 402 responses and retries with an `X-PAYMENT` header encoded from a demo payload generated using the local `PRIVATE_KEY`.

Env:
- PRIVATE_KEY: hex private key used to sign demo payment payload
- SERVICE_AGENT_URL: URL of service agent (default http://localhost:5402)

Run (dev):
- pnpm --filter demo/a2a/client-agent dev

