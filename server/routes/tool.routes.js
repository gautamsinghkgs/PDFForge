const express = require('express');
const router = express.Router();
const { processTool, getAllTools, getToolBySlug } = require('../controllers/tool.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { toolLimiter } = require('../middleware/rateLimit.middleware');
const upload = require('../middleware/upload.middleware');

// ── List all tools (public) ──
router.get('/', getAllTools);

// ── Get guest remaining uses (public) ──
router.get('/guest-remaining', async (req, res) => {
  try {
    const GuestUsage = require('../models/GuestUsage.model');
    const { guestId } = req.query;
    if (!guestId) return res.json({ success: true, remaining: 5 });
    const record = await GuestUsage.findOne({ guestId });
    const used = record ? record.count : 0;
    res.json({ success: true, remaining: Math.max(0, 5 - used) });
  } catch {
    res.json({ success: true, remaining: 5 });
  }
});

// ── Get single tool info (public) ──
router.get('/:slug/info', getToolBySlug);

// ── Process a tool — optional auth (guests allowed but rate-limited) ──
router.post(
  '/:toolSlug/process',
  optionalAuth,
  toolLimiter,
  upload.array('files', 20),
  processTool
);

module.exports = router;
