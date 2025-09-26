const express = require('express');
const rateLimiter = require('../middleware/rateLimiter');
const { commitReservation, releaseReservation } = require('../services/offersService');

const router = express.Router();

router.post('/:id/commit', rateLimiter, async (req, res, next) => {
  try {
    const reservation = await commitReservation(req.params.id);
    return res.json(reservation);
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/release', rateLimiter, async (req, res, next) => {
  try {
    const reservation = await releaseReservation(req.params.id);
    return res.json(reservation);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
