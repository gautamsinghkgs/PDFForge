/**
 * CRA dev server: forward API requests to the Express app.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

/** Express root URL only, not a URL ending in /api. */
function proxyTarget() {
  const raw = (process.env.REACT_APP_API_URL || 'http://localhost:5000').trim();
  if (!/^https?:\/\//i.test(raw)) return 'http://localhost:5000';
  try {
    const u = new URL(raw);
    let p = u.pathname.replace(/\/$/, '');
    if (p === '/api' || /\/api$/i.test(p)) {
      p = p.replace(/\/api$/i, '') || '';
    }
    if (!p || p === '/') return u.origin;
    return `${u.origin}${p}`;
  } catch {
    return 'http://localhost:5000';
  }
}

module.exports = function (app) {
  const target = proxyTarget();

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );

};
