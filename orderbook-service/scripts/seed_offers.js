#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const {
  canonicalizeOffer,
  hashCanonicalString,
} = require('../src/services/signature');

dotenv.config();

const DEFAULT_COUNT = 10;
const DEFAULT_URL = process.env.ORDERBOOK_URL || 'http://localhost:3000';
const FIXTURES_PATH = path.join(__dirname, '..', 'fixtures', 'seed_offers.json');
const SNAPSHOT_PATH = path.join(__dirname, '..', 'snapshots', 'offers_snapshot.json');

function parseArgs(argv) {
  const args = { count: DEFAULT_COUNT, url: DEFAULT_URL };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === '--count' || arg === '-c') && argv[i + 1]) {
      args.count = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (arg.startsWith('--url=')) {
      args.url = arg.split('=')[1];
    } else if (arg === '--url' && argv[i + 1]) {
      args.url = argv[i + 1];
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  if (!Number.isFinite(args.count) || args.count <= 0) {
    throw new Error('Count must be a positive integer');
  }

  return args;
}

function printHelp(baseUrl) {
  const helpText = `Seed the orderbook service with deterministic offers.

Usage: node scripts/seed_offers.js [--count N] [--url http://localhost:3000]

Options:
  --count, -c   Number of offers to seed (default ${DEFAULT_COUNT})
  --url         Override orderbook service base URL (default ${baseUrl})
  --help, -h    Show this help message
`;
  console.log(helpText);
}

function loadFixtures() {
  if (!fs.existsSync(FIXTURES_PATH)) {
    throw new Error(`Fixture file not found at ${FIXTURES_PATH}`);
  }
  const raw = fs.readFileSync(FIXTURES_PATH, 'utf8');
  const fixtures = JSON.parse(raw);
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    throw new Error('Fixture file must contain a non-empty array');
  }
  return fixtures;
}

async function postOffer(baseUrl, payload) {
  const response = await fetch(`${baseUrl}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to post offer (${response.status}): ${text}`);
  }

  return response.json();
}

async function fetchSnapshot(baseUrl) {
  const response = await fetch(`${baseUrl}/offers?limit=100`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch offers snapshot (${response.status}): ${text}`);
  }
  return response.json();
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    if (args.help) {
      printHelp(args.url);
      process.exit(0);
    }

    const fixtures = loadFixtures();
    const results = [];
    const nonceOffsets = new Map();

    for (let i = 0; i < args.count; i += 1) {
      const fixture = fixtures[i % fixtures.length];
      const wallet = new ethers.Wallet(fixture.privateKey);
      const offer = { ...fixture.offer };

      if (!offer.seller_pubkey) {
        offer.seller_pubkey = wallet.address;
      }

      const sellerKey = offer.seller_pubkey.toLowerCase();
      const offset = nonceOffsets.get(sellerKey) || 0n;
      const baseNonce = BigInt(offer.nonce || 1);
      const nonce = baseNonce + offset;
      nonceOffsets.set(sellerKey, offset + 1n);
      offer.nonce = nonce.toString();

      const canonical = canonicalizeOffer(offer);
      const digest = hashCanonicalString(canonical);
      const signature = await wallet.signMessage(ethers.getBytes(digest));

      const payload = { ...offer, signature };
      const response = await postOffer(args.url, payload);
      results.push({ id: response.id, seller_pubkey: response.seller_pubkey, nonce: response.nonce });
      console.log(`Seeded offer ${response.id} (seller ${response.seller_pubkey})`);
    }

    const snapshot = await fetchSnapshot(args.url);
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
    console.log(`Snapshot saved to ${SNAPSHOT_PATH}`);
    console.log(`Seeded ${results.length} offers successfully.`);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
