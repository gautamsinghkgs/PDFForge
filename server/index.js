const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { UPLOAD_ROOT } = require('./config/paths');

const authRoutes     = require('./routes/auth.routes');
const userRoutes     = require('./routes/user.routes');
const toolRoutes     = require('./routes/tool.routes');
const historyRoutes  = require('./routes/history.routes');
const downloadRoutes = require('./routes/download.routes');
const paymentRoutes = require('./routes/payment.routes');
const { sweepExpiredOutputs, DOWNLOAD_TTL_MS } = require('./utils/downloads');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { sanitize, xssSanitize } = require('./middleware/sanitize.middleware');
const { autoSeed } = require('./utils/autoSeed');
const hpp = require('hpp');

const app = express();

// ── Trust proxy for correct IP in rate limiting behind reverse proxy ──
app.set('trust proxy', 1);

// ── Ensure upload folder exists ──
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// ── Security Middleware ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://api.razorpay.com"],
        frameSrc: ["https://api.razorpay.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
  })
);

app.use(morgan('combined'));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Malformed JSON handler ──
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }
  next();
});

app.use('/api', apiLimiter);

// ── Security event logger (must be before sanitize/logging middleware) ──
function logSecurityEvent(event, req, details = {}) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const user = req.user ? req.user._id : 'guest';
  const log = `[SECURITY] ${event} | IP: ${ip} | User: ${user} | ${JSON.stringify(details)}`;
  if (process.env.NODE_ENV === 'production') {
    fs.appendFileSync(path.join(__dirname, 'security.log'), log + '\n');
  }
  console.warn(log);
}

app.use((req, res, next) => {
  req.logSecurity = (event, details) => logSecurityEvent(event, req, details);
  next();
});

// ── Additional Security Hardening (after body parser) ──
app.use(hpp());                              // HTTP Parameter Pollution
app.use(sanitize);                           // NoSQL injection ($, . operators blocked)
app.use(xssSanitize);                        // XSS: strip < > " ' from string inputs

// ── Routes ──
app.use('/api/auth',    authRoutes);
app.use('/api/user',    userRoutes);
app.use('/api/tools',   toolRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/payments', paymentRoutes);

// ── Health check (Render uses /healthz, Vercel/Railway may use others) ──
app.get(['/healthz', '/api/health', '/health'], (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.statusCode || 500).json({
    success: false,
    message: isProduction ? 'Internal Server Error' : err.message,
  });
});

// ── Connect MongoDB & Start ──
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const sweep = () => {
      const removed = sweepExpiredOutputs();
      if (removed) console.log(`Removed ${removed} expired output file(s)`);
    };
    sweep();
    setInterval(sweep, Math.min(DOWNLOAD_TTL_MS, 15 * 60 * 1000)).unref();
    console.log('✅ MongoDB connected');
    autoSeed();
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
