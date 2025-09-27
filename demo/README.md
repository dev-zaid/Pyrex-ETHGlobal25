# A2A x402 Polygon Amoy Demo

## Overview
This demonstration showcases **Agent-to-Agent (A2A)** cooperation using the **x402 payment protocol**. Two independent agents work together to request and pay for premium HTTP resources, with payments settled on **Polygon Amoy testnet** (chainId 80002) using an EIP-3009 style transferWithAuthorization flow.

***

## Architecture Components

### **Core Services**

| Component | Location | Description |
|-----------|----------|-------------|
| **Facilitator** | `/demo/a2a/facilitator-amoy` | Verifies payment payloads and optionally broadcasts settlement transactions on Amoy |
| **Resource Server** | `/demo/a2a/resource-server-express` | Exposes premium endpoint (`/premium/summarize`) and returns 402 challenges with PaymentRequirements |
| **Service Agent** | `/demo/a2a/service-agent` | A2A server implementing minimal JSON-RPC message/send functionality and proxying premium requests |
| **Client Agent** | `/demo/a2a/client-agent` | A2A client that handles message sending, 402 responses, EIP-712 X-PAYMENT payload construction, and retries |

***

## Quick Start Guide

### Prerequisites
- Configured `demo/.env.local` with:
  - Private keys (**testnet only**)
  - Amoy RPC endpoint
  - Token contract address

### Launch Instructions
1. **Setup Environment**
   ```bash
   # Configure your environment file
   # WARNING: Never commit real keys to version control
   ```

2. **Compile Packages**
   ```bash
   # From repository root
   # Compile packages or use helper script
   ```

3. **Start All Services**
   ```bash
   bash demo/scripts/start-all.sh
   ```

***

## Documentation & Logs

### **Detailed Documentation**
- **Technical specifications**: `demo/technical.md`
- **Design decisions and implementation details**

### **Runtime Monitoring**
Log files are automatically generated during local runs:
```
/tmp/client.log      # Client agent logs
/tmp/facilitator.log # Facilitator service logs  
/tmp/resource.log    # Resource server logs
/tmp/service.log     # Service agent logs
```

***

## Security Considerations

### **Important Safety Notes**

- **Testnet Only**: This demo uses Polygon Amoy testnet
- **Test Accounts**: Only use funded test accounts
- **No Mainnet**: Never use mainnet keys or addresses
- **Production Ready**: Simplified logic and in-memory nonce handling - not suitable for production use

### **Best Practices**
- Keep private keys secure and never commit to repositories
- Use dedicated test accounts for demonstration purposes
- Enable `REAL_SETTLE=true` only with proper testnet configuration

***

## Next Steps

For manual component execution or advanced configuration, refer to individual component documentation and the technical specifications in `demo/technical.md`.