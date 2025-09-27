const express = require("express");
const rateLimiter = require("../middleware/rateLimiter");
const { validateAndNormalizeOffer } = require("../validators/offerValidator");
const {
  verifyOfferSignature,
  verifyCancelSignature,
} = require("../services/signature");
const offersService = require("../services/offersService");

const router = express.Router();

function formatValidationErrors(errors) {
  if (!errors || errors.length === 0) {
    return "Invalid payload";
  }
  return errors.join("; ");
}

router.get("/", async (req, res, next) => {
  try {
    const { chain, token, min_amount, max_amount, limit, sort } = req.query;
    const offers = await offersService.getOffers({
      chain,
      token,
      min_amount,
      max_amount,
      limit,
      sort,
    });
    return res.json({ offers, count: offers.length });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const offer = await offersService.getOfferById(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }
    return res.json(offer);
  } catch (err) {
    return next(err);
  }
});

router.post("/", rateLimiter, async (req, res, next) => {
  try {
    const { signature, ...payload } = req.body || {};

    if (!signature) {
      return res.status(400).json({ error: "Signature is required" });
    }

    const { valid, errors, value } = validateAndNormalizeOffer(payload);
    if (!valid) {
      return res.status(400).json({ error: formatValidationErrors(errors) });
    }

    // const isValidSignature = verifyOfferSignature(value, signature);
    // if (!isValidSignature) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const savedOffer = await offersService.createOrUpdateOffer(
      value,
      signature
    );
    return res.status(201).json(savedOffer);
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/reserve", rateLimiter, async (req, res, next) => {
  try {
    const { amount_pyusd } = req.body || {};
    if (amount_pyusd === undefined || amount_pyusd === null) {
      return res.status(400).json({ error: "amount_pyusd is required" });
    }

    const result = await offersService.reserveOffer(
      req.params.id,
      amount_pyusd
    );
    return res.status(201).json({
      reservation_id: result.reservation.id,
      offer_id: result.reservation.offer_id,
      amount_pyusd: result.reservation.amount_pyusd,
      status: result.reservation.status,
      remaining_available_pyusd: result.remaining_available,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/cancel", rateLimiter, async (req, res, next) => {
  try {
    const { signature, nonce, seller_pubkey } = req.body || {};
    if (!signature || nonce === undefined || nonce === null || !seller_pubkey) {
      return res
        .status(400)
        .json({ error: "Signature, nonce and seller_pubkey are required" });
    }

    const offerId = req.params.id;
    const nonceBigInt = BigInt(nonce);

    const isValidSignature = verifyCancelSignature(
      offerId,
      nonceBigInt,
      signature,
      seller_pubkey
    );
    if (!isValidSignature) {
      return res
        .status(401)
        .json({ error: "Invalid signature for cancellation" });
    }

    const cancelled = await offersService.cancelOffer(
      offerId,
      nonceBigInt,
      signature,
      seller_pubkey
    );
    return res.json(cancelled);
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", rateLimiter, async (req, res, next) => {
  try {
    const { signature, available_pyusd, nonce, seller_pubkey } = req.body || {};
    if (
      !signature ||
      available_pyusd === undefined ||
      available_pyusd === null ||
      nonce === undefined ||
      nonce === null ||
      !seller_pubkey
    ) {
      return res
        .status(400)
        .json({
          error:
            "Signature, available_pyusd, nonce and seller_pubkey are required",
        });
    }

    const offerId = req.params.id;
    const nonceBigInt = BigInt(nonce);

    const updated = await offersService.updateAvailableAmount(offerId, {
      available_pyusd,
      nonce: nonceBigInt,
      signature,
      seller_pubkey,
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
