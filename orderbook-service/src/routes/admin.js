const express = require('express');
const rateLimiter = require('../middleware/rateLimiter');
const { query } = require('../db');

const router = express.Router();

router.get('/metrics', rateLimiter, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*) FROM offers) AS offers_total,
        (SELECT COUNT(*) FROM offers WHERE status = 'active') AS offers_active,
        (SELECT COUNT(*) FROM offers WHERE status = 'cancelled') AS offers_cancelled,
        (SELECT COALESCE(SUM(available_pyusd), 0) FROM offers WHERE status = 'active') AS offers_active_liquidity,
        (SELECT COALESCE(MAX(updated_at), MAX(created_at)) FROM offers) AS offers_last_updated,
        (SELECT COUNT(*) FROM reservations) AS reservations_total,
        (SELECT COUNT(*) FROM reservations WHERE status = 'pending') AS reservations_pending,
        (SELECT COUNT(*) FROM reservations WHERE status = 'committed') AS reservations_committed,
        (SELECT COUNT(*) FROM reservations WHERE status = 'released') AS reservations_released,
        (SELECT COALESCE(MAX(updated_at), MAX(created_at)) FROM reservations) AS reservations_last_updated
    `);

    const metrics = rows[0] || {};
    res.json({
      offers: {
        total: Number(metrics.offers_total || 0),
        active: Number(metrics.offers_active || 0),
        cancelled: Number(metrics.offers_cancelled || 0),
        active_liquidity_pyusd: metrics.offers_active_liquidity
          ? Number(metrics.offers_active_liquidity)
          : 0,
        last_updated: metrics.offers_last_updated
          ? new Date(metrics.offers_last_updated).toISOString()
          : null,
      },
      reservations: {
        total: Number(metrics.reservations_total || 0),
        pending: Number(metrics.reservations_pending || 0),
        committed: Number(metrics.reservations_committed || 0),
        released: Number(metrics.reservations_released || 0),
        last_updated: metrics.reservations_last_updated
          ? new Date(metrics.reservations_last_updated).toISOString()
          : null,
      },
      service: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return next(err);
  }
  return undefined;
});

module.exports = router;
