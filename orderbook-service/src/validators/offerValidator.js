const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { ethers } = require('ethers');
const { formatFixed } = require('../services/signature');

const DECIMALS = {
  rate: 18,
  amount: 8,
  fee: 6,
};

const ajv = new Ajv({ allErrors: true, useDefaults: true });
addFormats(ajv);

const schema = {
  type: 'object',
  additionalProperties: false,
  required: [
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
  ],
  properties: {
    seller_pubkey: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    chain: { type: 'string', minLength: 1 },
    token: { type: 'string', minLength: 1 },
    rate_pyusd_per_inr: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    min_pyusd: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    max_pyusd: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    available_pyusd: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    fee_pct: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    est_latency_ms: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'string' }, { type: 'number', minimum: 0 }] },
    supports_swap: { type: 'boolean' },
    upi_enabled: { type: 'boolean' },
    nonce: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'string' }] },
    expiry_timestamp: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
  },
};

const validateSchema = ajv.compile(schema);

function toDecimalString(value, fieldName) {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }
  throw new Error(`${fieldName} must be a string or number`);
}

function toPositiveBigInt(value, fieldName) {
  try {
    const bigintValue = typeof value === 'bigint' ? value : BigInt(value);
    if (bigintValue < 0n) {
      throw new Error(`${fieldName} must be zero or positive`);
    }
    return bigintValue;
  } catch (err) {
    throw new Error(`${fieldName} must be an integer value`);
  }
}

function validateDecimalRange(value, decimals, fieldName, { allowZero = false } = {}) {
  let baseUnits;
  try {
    baseUnits = ethers.parseUnits(value, decimals);
  } catch (err) {
    throw new Error(`${fieldName} has invalid precision`);
  }

  if (baseUnits < 0n) {
    throw new Error(`${fieldName} must be greater than or equal to 0`);
  }

  if (!allowZero && baseUnits === 0n) {
    throw new Error(`${fieldName} must be greater than 0`);
  }

  return baseUnits;
}

function validateAndNormalizeOffer(payload) {
  const data = { ...payload };
  const valid = validateSchema(data);
  if (!valid) {
    const errors = (validateSchema.errors || []).map((err) => `${err.instancePath || 'offer'} ${err.message}`.trim());
    return { valid: false, errors };
  }

  try {
    // Validate seller pubkey format via ethers without altering original casing
    ethers.getAddress(data.seller_pubkey);

    const rateStr = toDecimalString(data.rate_pyusd_per_inr, 'rate_pyusd_per_inr');
    const minStr = toDecimalString(data.min_pyusd, 'min_pyusd');
    const maxStr = toDecimalString(data.max_pyusd, 'max_pyusd');
    const availableStr = toDecimalString(data.available_pyusd, 'available_pyusd');
    const feeStr = toDecimalString(data.fee_pct, 'fee_pct');

    const rateUnits = validateDecimalRange(rateStr, DECIMALS.rate, 'rate_pyusd_per_inr');
    const minUnits = validateDecimalRange(minStr, DECIMALS.amount, 'min_pyusd');
    const maxUnits = validateDecimalRange(maxStr, DECIMALS.amount, 'max_pyusd');
    const availableUnits = validateDecimalRange(availableStr, DECIMALS.amount, 'available_pyusd', { allowZero: false });
    validateDecimalRange(feeStr, DECIMALS.fee, 'fee_pct', { allowZero: true });

    if (maxUnits < minUnits) {
      throw new Error('max_pyusd must be greater than or equal to min_pyusd');
    }

    if (availableUnits > maxUnits) {
      throw new Error('available_pyusd must be less than or equal to max_pyusd');
    }

    if (availableUnits < minUnits) {
      throw new Error('available_pyusd must be greater than or equal to min_pyusd');
    }

    const estLatency = Number(data.est_latency_ms);
    if (!Number.isFinite(estLatency) || estLatency < 0) {
      throw new Error('est_latency_ms must be a non-negative number');
    }

    const nonceBigInt = toPositiveBigInt(data.nonce, 'nonce');

    const normalized = {
      seller_pubkey: data.seller_pubkey,
      chain: data.chain || 'polygon',
      token: data.token || 'PYUSD',
      rate_pyusd_per_inr: formatFixed(rateStr, DECIMALS.rate),
      min_pyusd: formatFixed(minStr, DECIMALS.amount),
      max_pyusd: formatFixed(maxStr, DECIMALS.amount),
      available_pyusd: formatFixed(availableStr, DECIMALS.amount),
      fee_pct: formatFixed(feeStr, DECIMALS.fee),
      est_latency_ms: Math.round(estLatency),
      supports_swap: Boolean(data.supports_swap),
      upi_enabled: Boolean(data.upi_enabled),
      nonce: nonceBigInt,
      expiry_timestamp: data.expiry_timestamp || null,
    };

    return { valid: true, value: normalized };
  } catch (err) {
    return { valid: false, errors: [err.message] };
  }
}

module.exports = {
  validateAndNormalizeOffer,
};
