# Technical Details — A2A x402 Polygon Amoy Demo

<img src="https://github.com/AkshatGada/x402_Polygon/blob/main/demo/a2a/frontend/image.png" alt="Full Flow" width="400"/>

This document outlines the technical architecture, file responsibilities, protocol mappings (A2A, x402), EIP-712 typed-data, and design rationale for the demo implemented under `demo/a2a/`.

***

## 1. High-Level Architecture

**Client Agent (A2A client)**
- Sends JSON-RPC `message/send` to Service Agent's endpoint.
- When requesting a premium skill, if the Resource Server returns 402 with `accepts`, the client constructs an EIP-712 `PaymentPayload` for the `exact` (EIP-3009) scheme and encodes it as base64 in the `X-PAYMENT` header.
- The client retries the `message/send` call with `X-PAYMENT`; Service Agent forwards this header to the Resource Server.

**Service Agent (A2A server)**
- Minimal JSON-RPC handler at `/a2a` supporting `message/send`.
- For `skill === "premium.summarize"`, it calls Resource Server `/premium/summarize` and returns upstream `result` or `error`. Propagates 402 `accepts` payload to A2A caller if appropriate.

**Resource Server (Express)**
- Exposes `POST /premium/summarize`.
- If no `X-PAYMENT` header, returns HTTP 402 with body `{ accepts: [ PaymentRequirements ] }`.
- Each PaymentRequirements includes fields such as `scheme: 'exact'`, `network: 'polygon-amoy'`, `asset`, `payTo`, `maxAmountRequired`, `maxTimeoutSeconds`, `extra`, and `outputSchema`.
- If `X-PAYMENT` header is present, calls Facilitator `/verify`.
- On successful verification, processes the premium request and calls Facilitator `/settle` to broadcast the EIP-3009 transaction (if configured to settle).
- Adds `X-PAYMENT-RESPONSE` header (base64 JSON) with `{ success, transaction, network, payer }`.

**Facilitator (Amoy)**
- `/supported` returns supported `network: polygon-amoy` and `scheme: exact`.
- `/verify` accepts base64 PaymentPayload (or `X-PAYMENT` header) and validates:
  - `chainId` equals 80002
  - Validity window (`validAfter`, `validBefore`)
  - Nonce replay protection
  - EIP-712 typed-data signature verification using `ethers.verifyTypedData(domain, types, message, signature)`
  - Fallback to raw `keccak256(JSON)` recovery if typed-data verification fails (for demo compatibility)
- `/settle` calls `transferWithAuthorization` on the token contract using the facilitator signer if `REAL_SETTLE=true`, waits for confirmation, and returns the transaction hash.

***

## 2. Files Added/Modified (Exact Paths)

- **Main folder**
  - `demo/a2a/`

- **Facilitator**
  - `demo/a2a/facilitator-amoy/src/index.ts` — Implements `/supported`, `/verify`, `/settle`, healthz, in-memory nonce, EIP-712 logic.
  - `demo/a2a/facilitator-amoy/src/types.ts` — DTOs for PaymentPayload and related types.
  - `demo/a2a/facilitator-amoy/package.json`, `tsconfig.json` — Config and compilation targets.

- **Resource Server**
  - `demo/a2a/resource-server-express/src/index.ts` — Express server `/premium/summarize`, uses x402 helpers.
  - `demo/a2a/resource-server-express/src/x402.ts` — Helper functions for PaymentRequirements, payment verification, settlement.
  - `demo/a2a/resource-server-express/src/premium/summarize.ts` — Summarization handler.

- **Service Agent (A2A server)**
  - `demo/a2a/service-agent/src/index.ts` — JSON-RPC router at `/a2a` for `message/send`.
  - `demo/a2a/service-agent/src/client/http.ts` — Axios wrapper to call resource server with `X-PAYMENT`.
  - `demo/a2a/service-agent/agent-card.json` — AgentCard advertising JSONRPC transport.

- **Client Agent (A2A client)**
  - `demo/a2a/client-agent/src/index.ts` — CLI entry for `premium.summarize`.
  - `demo/a2a/client-agent/src/a2a.ts` — JSON-RPC client, handles 402, constructs payment payload, retries.
  - `demo/a2a/client-agent/src/payment.ts` — EIP‑712 TransferWithAuthorization payload creator, base64 encoding.

- **Demo Config**
  - `demo/.env.local` — Environment variables (RPC, keys, addresses, AMOY_PYUSD_ADDRESS, REAL_SETTLE, PAYMENT_AMOUNT, etc.)

***

## 3. Protocol Specifics & EIP-712 Types

**A2A**
- Transport: JSON-RPC 2.0 over HTTP
- Minimal method: `message/send`
- AgentCard: `url`, `preferredTransport: "JSONRPC"`, `capabilities.streaming: false`
- Data model: minimal `Message` and `Task` shapes

**x402**
- Flow: 402 challenge → client sends `X-PAYMENT` (base64 PaymentPayload) → server verifies via Facilitator → server settles and sends `X-PAYMENT-RESPONSE`
- PaymentRequirements in 402 body:
  - `scheme: "exact"` (EIP-3009)
  - `network: "polygon-amoy"` (chainId 80002)
  - Includes fields for resource, payTo, asset, maxAmountRequired, maxTimeoutSeconds, and extra (name/version)

**EIP-712 typed-data (TransferWithAuthorization)**
- Domain:
  - `{ name: , version: , chainId: 80002, verifyingContract:  }`
- Types:
  ```
  TransferWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce
  )
  ```

**Facilitator Verification Steps**
- Decode `X-PAYMENT` base64 to JSON payload
- Check `payload.chainId === 80002`
- Ensure `validAfter ` and confirm on Amoy explorer.

***

## 7. Notes for Cleanup and Next Work

- Add durable nonce storage (such as Redis or a database) and idempotency for `/settle`
- Improve facilitator error handling, retries, and observability
- Add support for `message/stream` (SSE) and push notifications

