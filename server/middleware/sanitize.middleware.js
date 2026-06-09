const mongoSanitize = require('express-mongo-sanitize');

exports.sanitize = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    if (req.logSecurity) {
      req.logSecurity('NOSQL_INJECTION_BLOCKED', { key, body: req.body });
    }
  },
});

function stripXSS(value) {
  if (typeof value === 'string') {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  return value;
}

exports.xssSanitize = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = stripXSS(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
