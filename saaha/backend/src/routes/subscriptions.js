const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

const PLANS = {
  normal: { price: 4999, label: 'Normal Restaurant' },
  big: { price: 6999, label: 'Big Restaurant' },
};

// ── Get Subscription Plans ───────────────────────────────
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      {
        type: 'normal',
        name: 'Normal Restaurant Plan',
        price: 4999,
        duration: '1 month',
        features: [
          'Unlimited orders',
          'Only 10% commission',
          'Restaurant dashboard',
          'Basic analytics',
          'Customer ratings',
          'Weekly payouts',
        ],
      },
      {
        type: 'big',
        name: 'Big Restaurant Plan',
        price: 6999,
        duration: '1 month',
        features: [
          'Everything in Normal',
          'Priority listing',
          'Advanced analytics',
          'Promo banner slots',
          'Dedicated support',
          'Multi-branch support (coming soon)',
        ],
      },
    ],
    commission: '10% on every order',
    delivery_fee: '₹40 flat (collected from customer)',
    platform_fee: '₹0',
    handling_fee: '₹0',
  });
});

// ── Create Subscription (after payment success) ──────────
router.post('/activate', auth(['restaurant']), async (req, res) => {
  const { plan_type, payment_id, demo_mode } = req.body;

  if (!PLANS[plan_type]) {
    return res.status(400).json({ success: false, message: 'Invalid plan type' });
  }

  // Lazy-load Razorpay SDK if keys are present
  let razorpay = null;
  function getRazorpay() {
    if (razorpay) return razorpay;
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    return razorpay;
  }

  const rzp = getRazorpay();

  try {
    // If real Razorpay keys are configured, verify the payment server-side
    if (rzp) {
      if (!payment_id) return res.status(400).json({ success: false, message: 'payment_id required' });
      try {
        const fetched = await rzp.payments.fetch(payment_id);
        if (!fetched || !['captured', 'authorized'].includes(fetched.status)) {
          return res.status(400).json({ success: false, message: 'Payment not completed' });
        }
        const expectedAmount = Math.round(PLANS[plan_type].price * 100);
        if (parseInt(fetched.amount, 10) !== expectedAmount) {
          return res.status(400).json({ success: false, message: 'Payment amount mismatch' });
        }
      } catch (err) {
        console.error('Razorpay fetch error:', err);
        return res.status(500).json({ success: false, message: 'Payment verification failed' });
      }
    } else {
      // Demo/dev fallback — allow activation only if demo_mode true or payment_id looks like a demo id
      if (!demo_mode && !(payment_id && String(payment_id).startsWith('demo_'))) {
        return res.status(400).json({ success: false, message: 'Payment verification not available — run in demo_mode or provide a demo payment id' });
      }
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Create subscription record (payment_status set to 'paid' because we verified above)
    await db.query(
      `INSERT INTO subscriptions (restaurant_id, plan_type, amount, start_date, end_date, payment_id, payment_status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,'paid',true)`,
      [req.user.id, plan_type, PLANS[plan_type].price, startDate, endDate, payment_id]
    );

    // Activate restaurant
    await db.query(
      `UPDATE restaurants SET
         subscription_type=$1, subscription_start=$2, subscription_end=$3,
         subscription_status='active', is_active=true, updated_at=NOW()
       WHERE id=$4`,
      [plan_type, startDate, endDate, req.user.id]
    );

    res.json({
      success: true,
      message: `${PLANS[plan_type].label} plan activated! Your restaurant is now live on SAAHA.`,
      subscription: { plan_type, start_date: startDate, end_date: endDate },
    });
  } catch (err) {
    console.error('Subscription activation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Subscription Status ──────────────────────────────────
router.get('/status', auth(['restaurant']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT subscription_type, subscription_status, subscription_start, subscription_end
       FROM restaurants WHERE id=$1`, [req.user.id]
    );
    const r = result.rows[0];
    const daysLeft = r.subscription_end
      ? Math.max(0, Math.ceil((new Date(r.subscription_end) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({ success: true, subscription: { ...r, days_left: daysLeft } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
