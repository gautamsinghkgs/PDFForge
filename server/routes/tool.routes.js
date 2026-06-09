const express = require('express');
const router = express.Router();
const { processTool, getAllTools, getToolBySlug } = require('../controllers/tool.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { toolLimiter } = require('../middleware/rateLimit.middleware');
const upload = require('../middleware/upload.middleware');

// ── List all tools (public) ──
router.get('/', getAllTools);

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
