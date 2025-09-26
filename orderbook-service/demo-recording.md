# Demo Recording Script (2–3 minutes)

1. **Intro (10s)**
   - "This is the FX Bridge orderbook service. It's a Node/Express API backed by Postgres verifying signed seller offers."

2. **Environment & Health (20s)**
   - Show `docker ps` to confirm Postgres running.
   - Run `curl http://localhost:3000/health` to show `{"status":"ok"}`.

3. **Seed Sellers (30s)**
   - Run `node scripts/seed_offers.js --count 5 --url http://localhost:3000`.
   - Point out log lines reporting inserted offer IDs and snapshot path.

4. **Inspect Orderbook (30s)**
   - `curl 'http://localhost:3000/offers?sort=rate_desc&limit=5' | jq '.'`
   - Highlight fields: `seller_pubkey`, `available_pyusd`, `nonce`.

5. **Submit New Offer (40s)**
   - Explain canonical signing (mention `demo/post_offer_request.json`).
   - `cat demo/post_offer_request.json`
   - `curl -X POST http://localhost:3000/offers -H 'Content-Type: application/json' -d @demo/post_offer_request.json`
   - Show DB verification: `psql ... -c "SELECT seller_pubkey, available_pyusd, nonce FROM offers ORDER BY created_at DESC LIMIT 1;"`

6. **Reserve & Commit (40s)**
   - `curl -X POST http://localhost:3000/offers/<offer_id>/reserve -d '{"amount_pyusd":"75"}'`
   - Then `curl -X POST http://localhost:3000/reservations/<reservation_id>/commit`
   - Show `curl http://localhost:3000/admin/metrics` to confirm counts.

7. **Wrap-up (10s)**
   - Mention concurrency-safe reservations, metrics endpoint, and seed tooling.
   - Invite questions.

