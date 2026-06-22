const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── Register Restaurant ──────────────────────────────────
router.post('/register', [
  body('owner_name').trim().notEmpty(),
  body('owner_email').isEmail(),
  body('owner_phone').isMobilePhone('en-IN'),
  body('password').isLength({ min: 6 }),
  body('restaurant_name').trim().notEmpty(),
  body('address').notEmpty(),
  body('city').notEmpty(),
  body('pincode').isLength({ min: 6, max: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const {
    owner_name, owner_email, owner_phone, password,
    restaurant_name, description, cuisine_types,
    address, city, pincode, fssai_number, gst_number,
  } = req.body;

  try {
    const exists = await db.query(
      'SELECT id FROM restaurants WHERE owner_email=$1 OR owner_phone=$2',
      [owner_email, owner_phone]
    );
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: 'Email or phone already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO restaurants
         (owner_name, owner_email, owner_phone, password_hash, restaurant_name,
          description, cuisine_types, address, city, pincode, fssai_number, gst_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, owner_name, owner_email, restaurant_name, city, is_verified, created_at`,
      [owner_name, owner_email, owner_phone, hash, restaurant_name,
       description, cuisine_types, address, city, pincode, fssai_number, gst_number]
    );

    res.status(201).json({
      success: true,
      message: 'Registration submitted. Verification takes 24-48 hours.',
      restaurant: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Login Restaurant ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query(
      'SELECT * FROM restaurants WHERE owner_email=$1', [email]
    );
    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const restaurant = result.rows[0];
    const match = await bcrypt.compare(password, restaurant.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!restaurant.is_verified) {
      return res.status(403).json({ success: false, message: 'Account pending verification' });
    }

    const token = jwt.sign(
      { id: restaurant.id, role: 'restaurant', email: restaurant.owner_email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...safe } = restaurant;
    res.json({ success: true, token, restaurant: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get Restaurant Profile ───────────────────────────────
router.get('/me', auth(['restaurant']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, owner_name, owner_email, owner_phone, restaurant_name, description,
              cuisine_types, logo_url, cover_image_url, address, city, pincode,
              opening_time, closing_time, avg_prep_time, is_veg_only, is_verified,
              is_active, is_open, rating, total_ratings, subscription_type,
              subscription_status, subscription_end, created_at
       FROM restaurants WHERE id=$1`, [req.user.id]
    );
    res.json({ success: true, restaurant: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Toggle Restaurant Open/Close ─────────────────────────
router.patch('/toggle', auth(['restaurant']), async (req, res) => {
  try {
    const r = await db.query('SELECT is_open, subscription_status FROM restaurants WHERE id=$1', [req.user.id]);
    if (r.rows[0].subscription_status !== 'active') {
      return res.status(403).json({ success: false, message: 'Active subscription required to go live' });
    }
    const result = await db.query(
      'UPDATE restaurants SET is_open = NOT is_open, updated_at=NOW() WHERE id=$1 RETURNING is_open',
      [req.user.id]
    );
    res.json({ success: true, is_open: result.rows[0].is_open });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Dashboard Stats ──────────────────────────────────────
router.get('/dashboard', auth(['restaurant']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [todayOrders, totalOrders, weekRevenue] = await Promise.all([
      db.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(restaurant_payout),0) as revenue
         FROM orders WHERE restaurant_id=$1 AND DATE(placed_at)=$2 AND status='delivered'`,
        [req.user.id, today]
      ),
      db.query(
        `SELECT COUNT(*) as count FROM orders WHERE restaurant_id=$1 AND status='delivered'`,
        [req.user.id]
      ),
      db.query(
        `SELECT COALESCE(SUM(restaurant_payout),0) as revenue
         FROM orders WHERE restaurant_id=$1 AND status='delivered'
         AND placed_at >= NOW() - INTERVAL '7 days'`,
        [req.user.id]
      ),
    ]);

    res.json({
      success: true,
      stats: {
        today_orders: parseInt(todayOrders.rows[0].count),
        today_revenue: parseFloat(todayOrders.rows[0].revenue),
        total_orders: parseInt(totalOrders.rows[0].count),
        week_revenue: parseFloat(weekRevenue.rows[0].revenue),
        commission_rate: '10%',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
