const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { validationResult } = require('express-validator');
const User = require('../models/User.model');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Generate JWT ──
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '1d' });

// ── @route  POST /api/auth/register ──
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, password } = req.body;

  if (!password || password.length < 8)
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
    return res.status(400).json({ success: false, message: 'Password must contain uppercase, lowercase, and a number' });

  try {
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ── @route  POST /api/auth/login ──
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      if (req.logSecurity) req.logSecurity('LOGIN_FAILED', { reason: 'user_not_found', email });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      if (req.logSecurity) req.logSecurity('LOGIN_FAILED', { reason: 'wrong_password', email });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ── @route  POST /api/auth/google ──
exports.googleLogin = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ success: false, message: 'Google credential required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, avatar: picture || '', isVerified: true });
    } else if (!user.avatar && picture) {
      user.avatar = picture;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Google sign-in successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
};

// ── @route  GET /api/auth/me ──
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── @route  POST /api/auth/logout ──
exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};
