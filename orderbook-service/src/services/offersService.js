const { ethers } = require("ethers");
const { pool } = require("../db");
const { formatFixed, verifyOfferSignature } = require("./signature");

function sanitizeOfferRow(row) {
  if (!row) {
    return null;
  }
  const { signature, ...rest } = row;
  return rest;
}

function sanitizeReservationRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    offer_id: row.offer_id,
    amount_pyusd: formatFixed(row.amount_pyusd, 8),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatUnitsFixed(units, decimals) {
  const value = ethers.formatUnits(units, decimals);
  return formatFixed(value, decimals);
}

async function createOrUpdateOffer(offer, signature) {
  const client = await pool.connect();
  const expiryValue = offer.expiry_timestamp
    ? new Date(offer.expiry_timestamp)
    : null;

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      "SELECT * FROM offers WHERE seller_pubkey = $1 ORDER BY nonce DESC LIMIT 1 FOR UPDATE",
      [offer.seller_pubkey]
    );

    let savedRow;

    if (existingResult.rowCount > 0) {
      // const existingOffer = existingResult.rows[0];
      // const existingNonce = BigInt(existingOffer.nonce);
      // if (offer.nonce <= existingNonce) {
      //   const err = new Error('Nonce must be greater than previous nonce for seller');
      //   err.status = 409;
      //   throw err;
      // }

      const updateQuery = `
        UPDATE offers
        SET chain = $1,
            token = $2,
            rate_pyusd_per_inr = $3,
            min_pyusd = $4,
            max_pyusd = $5,
            available_pyusd = $6,
            fee_pct = $7,
            est_latency_ms = $8,
            supports_swap = $9,
            upi_enabled = $10,
            status = 'active',
            nonce = $11,
            expiry_timestamp = $12,
            signature = $13,
            updated_at = now()
        WHERE id = $14
        RETURNING *;
      `;

      const updateValues = [
        offer.chain,
        offer.token,
        offer.rate_pyusd_per_inr,
        offer.min_pyusd,
        offer.max_pyusd,
        offer.available_pyusd,
        offer.fee_pct,
        offer.est_latency_ms,
        offer.supports_swap,
        offer.upi_enabled,
        offer.nonce.toString(),
        expiryValue,
        signature,
        existingOffer.id,
      ];

      const updateResult = await client.query(updateQuery, updateValues);
      savedRow = updateResult.rows[0];
    } else {
      const insertQuery = `
        INSERT INTO offers (
          seller_pubkey,
          chain,
          token,
          rate_pyusd_per_inr,
          min_pyusd,
          max_pyusd,
          available_pyusd,
          fee_pct,
          est_latency_ms,
          supports_swap,
          upi_enabled,
          status,
          nonce,
          expiry_timestamp,
          signature
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, $13, $14
        )
        RETURNING *;
      `;

      const insertValues = [
        offer.seller_pubkey,
        offer.chain,
        offer.token,
        offer.rate_pyusd_per_inr,
        offer.min_pyusd,
        offer.max_pyusd,
        offer.available_pyusd,
        offer.fee_pct,
        offer.est_latency_ms,
        offer.supports_swap,
        offer.upi_enabled,
        offer.nonce.toString(),
        expiryValue,
        signature,
      ];

      const insertResult = await client.query(insertQuery, insertValues);
      savedRow = insertResult.rows[0];
    }

    await client.query("COMMIT");
    return sanitizeOfferRow(savedRow);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function normalizeAmountFilter(value) {
  if (value === undefined || value === null) return null;
  const asString = typeof value === "string" ? value : value.toString();
  return formatFixed(asString, 8);
}

async function getOffers(filters = {}) {
  const conditions = ["status = 'active'", "available_pyusd > 0"];
  const values = [];

  if (filters.chain) {
    values.push(filters.chain);
    conditions.push(`chain = $${values.length}`);
  }

  if (filters.token) {
    values.push(filters.token);
    conditions.push(`token = $${values.length}`);
  }

  const minAmount = normalizeAmountFilter(filters.min_amount);
  if (minAmount) {
    values.push(minAmount);
    conditions.push(`available_pyusd >= $${values.length}`);
  }

  const maxAmount = normalizeAmountFilter(filters.max_amount);
  if (maxAmount) {
    values.push(maxAmount);
    conditions.push(`available_pyusd <= $${values.length}`);
  }

  const nowParamIndex = values.length + 1;
  conditions.push(
    `(expiry_timestamp IS NULL OR expiry_timestamp > $${nowParamIndex})`
  );
  values.push(new Date());

  let limitClause = "";
  if (filters.limit) {
    const limitVal = Math.max(1, Math.min(Number(filters.limit) || 20, 100));
    limitClause = ` LIMIT ${limitVal}`;
  }

  let orderClause = " ORDER BY rate_pyusd_per_inr ASC";
  if (filters.sort === "latency") {
    orderClause = " ORDER BY est_latency_ms ASC";
  } else if (filters.sort === "rate_desc") {
    orderClause = " ORDER BY rate_pyusd_per_inr DESC";
  }

  const query = `
    SELECT *
    FROM offers
    WHERE ${conditions.join(" AND ")}
    ${orderClause}
    ${limitClause}
  `;

  const { rows } = await pool.query(query, values);
  return rows.map(sanitizeOfferRow);
}

async function getOfferById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM offers WHERE id = $1 AND status = 'active' AND (expiry_timestamp IS NULL OR expiry_timestamp > now())`,
    [id]
  );
  return sanitizeOfferRow(rows[0]);
}

async function updateAvailableAmount(
  offerId,
  { available_pyusd, nonce, signature, seller_pubkey }
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const offerResult = await client.query(
      "SELECT * FROM offers WHERE id = $1 FOR UPDATE",
      [offerId]
    );
    if (offerResult.rowCount === 0) {
      const err = new Error("Offer not found");
      err.status = 404;
      throw err;
    }

    const offer = offerResult.rows[0];
    if (offer.seller_pubkey !== seller_pubkey) {
      const err = new Error("Seller pubkey mismatch");
      err.status = 403;
      throw err;
    }

    if (offer.status !== "active") {
      const err = new Error("Offer is not active");
      err.status = 409;
      throw err;
    }

    const existingNonce = BigInt(offer.nonce);
    const incomingNonce = BigInt(nonce);
    if (incomingNonce <= existingNonce) {
      const err = new Error(
        "Nonce must be greater than previous nonce for offer update"
      );
      err.status = 409;
      throw err;
    }

    const newAvailable = formatFixed(available_pyusd, 8);
    const newAvailableUnits = ethers.parseUnits(newAvailable, 8);
    const minUnits = ethers.parseUnits(formatFixed(offer.min_pyusd, 8), 8);
    const maxUnits = ethers.parseUnits(formatFixed(offer.max_pyusd, 8), 8);

    if (newAvailableUnits < minUnits || newAvailableUnits > maxUnits) {
      const err = new Error(
        "available_pyusd must be within min and max bounds"
      );
      err.status = 400;
      throw err;
    }

    const expiryIso = offer.expiry_timestamp
      ? new Date(offer.expiry_timestamp).toISOString()
      : null;

    const canonicalOffer = {
      seller_pubkey: offer.seller_pubkey,
      chain: offer.chain,
      token: offer.token,
      rate_pyusd_per_inr: offer.rate_pyusd_per_inr,
      min_pyusd: offer.min_pyusd,
      max_pyusd: offer.max_pyusd,
      available_pyusd: newAvailable,
      fee_pct: offer.fee_pct,
      est_latency_ms: offer.est_latency_ms,
      supports_swap: offer.supports_swap,
      upi_enabled: offer.upi_enabled,
      nonce: incomingNonce,
      expiry_timestamp: expiryIso,
    };

    const isValidSignature = verifyOfferSignature(canonicalOffer, signature);
    if (!isValidSignature) {
      const err = new Error("Invalid signature for update");
      err.status = 401;
      throw err;
    }

    const updateResult = await client.query(
      `UPDATE offers
       SET available_pyusd = $1,
           nonce = $2,
           signature = $3,
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [newAvailable, incomingNonce.toString(), signature, offerId]
    );

    await client.query("COMMIT");
    return sanitizeOfferRow(updateResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function cancelOffer(offerId, nonce, signature, seller_pubkey) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const offerResult = await client.query(
      "SELECT * FROM offers WHERE id = $1 FOR UPDATE",
      [offerId]
    );
    if (offerResult.rowCount === 0) {
      const err = new Error("Offer not found");
      err.status = 404;
      throw err;
    }

    const offer = offerResult.rows[0];
    if (offer.seller_pubkey !== seller_pubkey) {
      const err = new Error("Seller pubkey mismatch");
      err.status = 403;
      throw err;
    }

    const existingNonce = BigInt(offer.nonce);
    const incomingNonce = BigInt(nonce);
    if (incomingNonce <= existingNonce) {
      const err = new Error(
        "Nonce must be greater than previous nonce for cancellation"
      );
      err.status = 409;
      throw err;
    }

    const updateResult = await client.query(
      `UPDATE offers
       SET status = 'cancelled',
           nonce = $1,
           signature = $2,
           updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [incomingNonce.toString(), signature, offerId]
    );

    await client.query("COMMIT");
    return sanitizeOfferRow(updateResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function reserveOffer(offerId, amount) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const offerResult = await client.query(
      "SELECT * FROM offers WHERE id = $1 FOR UPDATE",
      [offerId]
    );
    if (offerResult.rowCount === 0) {
      const err = new Error("Offer not found");
      err.status = 404;
      throw err;
    }

    const offer = offerResult.rows[0];
    if (offer.status !== "active") {
      const err = new Error("Offer is not active");
      err.status = 409;
      throw err;
    }

    const amountFixed = formatFixed(amount, 8);
    const amountUnits = ethers.parseUnits(amountFixed, 8);
    if (amountUnits <= 0n) {
      const err = new Error("Reservation amount must be greater than 0");
      err.status = 400;
      throw err;
    }

    const availableUnits = ethers.parseUnits(
      formatFixed(offer.available_pyusd, 8),
      8
    );
    if (availableUnits < amountUnits) {
      const err = new Error("Insufficient available liquidity for reservation");
      err.status = 409;
      throw err;
    }

    const newAvailableUnits = availableUnits - amountUnits;
    const newAvailable = formatUnitsFixed(newAvailableUnits, 8);

    const reservationResult = await client.query(
      `INSERT INTO reservations (offer_id, amount_pyusd, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [offerId, amountFixed]
    );

    await client.query(
      `UPDATE offers
       SET available_pyusd = $1,
           updated_at = now()
       WHERE id = $2`,
      [newAvailable, offerId]
    );

    await client.query("COMMIT");
    return {
      reservation: sanitizeReservationRow(reservationResult.rows[0]),
      remaining_available: newAvailable,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function commitReservation(reservationId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const reservationResult = await client.query(
      "SELECT * FROM reservations WHERE id = $1 FOR UPDATE",
      [reservationId]
    );

    if (reservationResult.rowCount === 0) {
      const err = new Error("Reservation not found");
      err.status = 404;
      throw err;
    }

    const reservation = reservationResult.rows[0];
    if (reservation.status === "committed") {
      await client.query("COMMIT");
      return sanitizeReservationRow(reservation);
    }

    if (reservation.status !== "pending") {
      const err = new Error("Reservation is not pending");
      err.status = 409;
      throw err;
    }

    const updateResult = await client.query(
      `UPDATE reservations
       SET status = 'committed',
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [reservationId]
    );

    await client.query("COMMIT");
    return sanitizeReservationRow(updateResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function releaseReservation(reservationId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const reservationResult = await client.query(
      "SELECT * FROM reservations WHERE id = $1 FOR UPDATE",
      [reservationId]
    );

    if (reservationResult.rowCount === 0) {
      const err = new Error("Reservation not found");
      err.status = 404;
      throw err;
    }

    const reservation = reservationResult.rows[0];
    if (reservation.status !== "pending") {
      const err = new Error("Reservation cannot be released");
      err.status = 409;
      throw err;
    }

    const offerResult = await client.query(
      "SELECT * FROM offers WHERE id = $1 FOR UPDATE",
      [reservation.offer_id]
    );
    if (offerResult.rowCount === 0) {
      const err = new Error("Offer not found for reservation");
      err.status = 404;
      throw err;
    }

    const offer = offerResult.rows[0];

    const amountUnits = ethers.parseUnits(
      formatFixed(reservation.amount_pyusd, 8),
      8
    );
    const availableUnits = ethers.parseUnits(
      formatFixed(offer.available_pyusd, 8),
      8
    );
    const newAvailableUnits = availableUnits + amountUnits;
    const newAvailable = formatUnitsFixed(newAvailableUnits, 8);

    await client.query(
      `UPDATE offers
       SET available_pyusd = $1,
           updated_at = now()
       WHERE id = $2`,
      [newAvailable, reservation.offer_id]
    );

    const updateResult = await client.query(
      `UPDATE reservations
       SET status = 'released',
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [reservationId]
    );

    await client.query("COMMIT");
    return sanitizeReservationRow(updateResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getReservationById(reservationId) {
  const { rows } = await pool.query(
    "SELECT * FROM reservations WHERE id = $1 LIMIT 1",
    [reservationId]
  );
  return sanitizeReservationRow(rows[0]);
}

module.exports = {
  createOrUpdateOffer,
  sanitizeOfferRow,
  getOffers,
  getOfferById,
  updateAvailableAmount,
  cancelOffer,
  reserveOffer,
  commitReservation,
  releaseReservation,
  getReservationById,
  sanitizeReservationRow,
};
