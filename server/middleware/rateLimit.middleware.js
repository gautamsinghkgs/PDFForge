const rateLimit = require('express-rate-limit');

// ── General API limit ──
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth routes limit ──
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── File processing limit ──
exports.toolLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, message: 'Hourly task limit reached. Upgrade to Pro for more.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user && req.user.plan !== 'free', // skip for paid users
});
