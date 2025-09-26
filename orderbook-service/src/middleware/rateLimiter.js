const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20; // per window per IP

const requestLog = new Map();

function rateLimiter(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const key = req.ip || req.headers['x-forwarded-for'] || 'global';
  const now = Date.now();
  const bucket = requestLog.get(key) || { count: 0, start: now };

  if (now - bucket.start > WINDOW_MS) {
    bucket.count = 0;
    bucket.start = now;
  }

  bucket.count += 1;
  requestLog.set(key, bucket);

  if (bucket.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  return next();
}

module.exports = rateLimiter;
