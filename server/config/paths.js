const path = require('path');

const SERVER_DIR = path.join(__dirname, '..');

/**
 * Absolute uploads dir (must match express.static in index.js).
 * Relative UPLOAD_PATH is resolved from the server folder, not process.cwd().
 */
const raw = process.env.UPLOAD_PATH || 'uploads';
const UPLOAD_ROOT = path.isAbsolute(raw)
  ? path.normalize(raw)
  : path.resolve(SERVER_DIR, raw);

module.exports = { UPLOAD_ROOT };
