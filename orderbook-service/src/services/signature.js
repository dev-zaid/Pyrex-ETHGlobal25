const { ethers } = require('ethers');

const RATE_DECIMALS = 18;
const AMOUNT_DECIMALS = 8;
const FEE_DECIMALS = 6;

const OFFER_FIELDS = [
  'seller_pubkey',
  'chain',
  'token',
  'rate_pyusd_per_inr',
  'min_pyusd',
  'max_pyusd',
  'available_pyusd',
  'fee_pct',
  'est_latency_ms',
  'supports_swap',
  'upi_enabled',
  'nonce',
  'expiry_timestamp',
];

function formatFixed(value, decimals) {
  if (value === undefined || value === null) return '';
  const valueStr = typeof value === 'string' ? value : value.toString();
  const baseUnits = ethers.parseUnits(valueStr, decimals);
  const negative = baseUnits < 0n;
  const absValue = negative ? -baseUnits : baseUnits;
  const raw = absValue.toString().padStart(decimals + 1, '0');
  const integerPart = raw.slice(0, raw.length - decimals) || '0';
  const fractionalPart = decimals === 0 ? '' : raw.slice(raw.length - decimals);
  const formatted = decimals === 0 ? integerPart : `${integerPart}.${fractionalPart}`;
  return negative ? `-${formatted}` : formatted;
}

function normalizeTimestamp(ts) {
  if (!ts) return null;
  if (ts instanceof Date) {
    return ts.toISOString();
  }
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function canonicalizeOffer(offer) {
  const parts = OFFER_FIELDS.map((field) => {
    const value = offer[field];
    switch (field) {
      case 'rate_pyusd_per_inr':
        return formatFixed(value, RATE_DECIMALS);
      case 'min_pyusd':
      case 'max_pyusd':
      case 'available_pyusd':
        return formatFixed(value, AMOUNT_DECIMALS);
      case 'fee_pct':
        return formatFixed(value, FEE_DECIMALS);
      case 'supports_swap':
      case 'upi_enabled':
        return value ? 'true' : 'false';
      case 'nonce':
        return value !== undefined && value !== null ? value.toString() : '';
      case 'expiry_timestamp':
        return normalizeTimestamp(value) || '';
      default:
        return value !== undefined && value !== null ? String(value) : '';
    }
  });

  return parts.join('|');
}

function canonicalizeCancel(offerId, nonce) {
  return `cancel:${offerId}:${nonce.toString()}`;
}

function hashCanonicalString(canonicalString) {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalString));
}

function verifySignatureFromCanonical(message, signature, expectedAddress) {
  const digest = hashCanonicalString(message);
  const recovered = ethers.verifyMessage(ethers.getBytes(digest), signature);
  return ethers.getAddress(recovered) === ethers.getAddress(expectedAddress);
}

function verifyOfferSignature(offer, signature) {
  if (!offer || !signature) {
    throw new Error('Offer and signature required');
  }

  const canonicalString = canonicalizeOffer(offer);
  return verifySignatureFromCanonical(canonicalString, signature, offer.seller_pubkey);
}

function verifyCancelSignature(offerId, nonce, signature, sellerPubkey) {
  const canonicalString = canonicalizeCancel(offerId, nonce);
  return verifySignatureFromCanonical(canonicalString, signature, sellerPubkey);
}

const canonicalize = canonicalizeOffer;
const verifySignature = verifyOfferSignature;

module.exports = {
  OFFER_FIELDS,
  canonicalizeOffer,
  canonicalizeCancel,
  verifyOfferSignature,
  verifyCancelSignature,
  hashCanonicalString,
  formatFixed,
  canonicalize,
  verifySignature,
};
