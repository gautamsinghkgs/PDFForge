'use strict';

const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User.model');

let razorpayInstance = null;

function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId === 'rzp_test_xxxxxxxxxxxx') {
    return null;
  }
  razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpayInstance;
}

const PLAN_PRICES = {
  pro: 999,      // ₹999  (₹9 → paise)
  enterprise: 2999, // ₹2999 (₹29 → paise)
};

// ── Create Razorpay Order ──
exports.createOrder = async (req, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
      });
    }

    const { plan } = req.body;
    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    if (req.user.plan !== 'free') {
      return res.status(400).json({ success: false, message: 'You already have an active plan' });
    }

    const amount = PLAN_PRICES[plan];
    const currency = 'INR';
    const receipt = `pdfforge_${req.user._id}_${Date.now()}`;

    const order = await rzp.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        userId: req.user._id.toString(),
        plan,
      },
    });

    await User.findByIdAndUpdate(req.user._id, {
      razorpayOrderId: order.id,
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        plan,
        userName: req.user.name,
        userEmail: req.user.email,
      },
    });
  } catch (err) {
    console.error('Create order failed:', err);
    res.status(500).json({ success: false, message: `Failed to create payment order: ${err.message}` });
  }
};

// ── Verify Payment & Upgrade Plan ──
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const rzp = getRazorpay();
    let payment;
    try {
      payment = await rzp.payments.fetch(razorpay_payment_id);
    } catch {
      return res.status(400).json({ success: false, message: 'Payment not found on Razorpay' });
    }

    const paymentPlan = payment.notes?.plan || 'pro';
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await User.findByIdAndUpdate(req.user._id, {
      plan: paymentPlan,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      subscriptionStatus: 'active',
      subscriptionEndDate: endDate,
    });

    res.json({
      success: true,
      message: `Plan upgraded to ${paymentPlan}`,
      plan: paymentPlan,
    });
  } catch (err) {
    console.error('Verify payment failed:', err.message);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

// ── Razorpay Webhook ──
exports.webhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      const receivedSignature = req.headers['x-razorpay-signature'];
      if (expectedSignature !== receivedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payment = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && payment) {
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const plan = payment.notes?.plan || 'pro';

      const user = await User.findOne({ razorpayOrderId: orderId });
      if (user) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        user.plan = plan;
        user.razorpayPaymentId = paymentId;
        user.subscriptionStatus = 'active';
        user.subscriptionEndDate = endDate;
        await user.save();
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

// ── Get active plan info ──
exports.getPlanInfo = async (req, res) => {
  res.json({
    success: true,
    plan: req.user.plan,
    subscriptionStatus: req.user.subscriptionStatus,
    subscriptionEndDate: req.user.subscriptionEndDate,
  });
};

// ── Generate UPI QR Code for payment ──
exports.createQRCode = async (req, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(503).json({ success: false, message: 'Payment gateway not configured' });
    }

    const { plan } = req.body;
    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const qrCode = await rzp.qrCode.create({
      type: 'upi_qr',
      name: `PDFForge ${plan} Plan`,
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: PLAN_PRICES[plan],
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - PDFForge`,
      notes: {
        userId: req.user._id.toString(),
        plan,
      },
    });

    res.json({
      success: true,
      qrCode: {
        id: qrCode.id,
        imageUrl: qrCode.image_url,
        amount: qrCode.payment_amount,
      },
    });
  } catch (err) {
    console.error('QR code creation failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
};
