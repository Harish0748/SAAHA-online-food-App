const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const auth = require('../middleware/auth');

// Lazy-load Razorpay SDK only if keys are configured, so the server
// still boots cleanly in dev/demo environments without real keys.
let razorpay = null;
function getRazorpay() {
  if (razorpay) return razorpay;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpay;
}

// ── Create Razorpay order (for order payment OR subscription payment) ──
router.post('/create-order', auth(['customer', 'restaurant']), async (req, res) => {
  const { amount, purpose, reference_id } = req.body; // amount in ₹ (rupees)
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount required' });
  }

  const rzp = getRazorpay();

  try {
    if (rzp) {
      // ── Real Razorpay flow ──
      const order = await rzp.orders.create({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        receipt: `saaha_${purpose}_${Date.now()}`,
        notes: { purpose, reference_id, user_id: req.user.id },
      });
      return res.json({
        success: true,
        payment_order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID,
          purpose,
        },
      });
    }

    // ── Demo/dev fallback (no real keys configured) ──
    res.json({
      success: true,
      demo_mode: true,
      payment_order: {
        id: `demo_order_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: 'INR',
        key: 'rzp_test_demo_key_not_configured',
        purpose,
      },
      message: 'RAZORPAY_KEY_ID/SECRET not set — running in demo mode. Configure real keys in .env for production.',
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    res.status(500).json({ success: false, message: 'Could not create payment order' });
  }
});

// ── Verify payment signature after checkout completes ──
router.post('/verify', auth(['customer', 'restaurant']), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, demo_mode } = req.body;

  // Demo mode: skip signature verification (dev/testing only)
  if (demo_mode || !process.env.RAZORPAY_KEY_SECRET) {
    return res.json({ success: true, verified: true, demo_mode: true, payment_id: razorpay_payment_id || `demo_${Date.now()}` });
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    res.json({ success: true, verified: true, payment_id: razorpay_payment_id });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ── Razorpay webhook (for async payment confirmations) ──
// Configure this URL in your Razorpay dashboard: POST /api/payments/webhook
router.post('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(200).json({ received: true, note: 'webhook secret not configured' });

  try {
    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', webhookSecret).update(req.rawBody).digest('hex');

    if (signature !== expected) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    console.log('📩 Razorpay webhook event:', event);
    // Handle events like payment.captured, payment.failed, etc. as needed

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
