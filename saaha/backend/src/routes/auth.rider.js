const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── Register Rider ───────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, phone, password, vehicle_type, vehicle_number, dl_number } = req.body;
  try {
    const exists = await db.query(
      'SELECT id FROM riders WHERE email=$1 OR phone=$2', [email, phone]
    );
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: 'Already registered' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO riders (name, email, phone, password_hash, vehicle_type, vehicle_number, dl_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, email, phone, vehicle_type`,
      [name, email, phone, hash, vehicle_type, vehicle_number, dl_number]
    );
    res.status(201).json({
      success: true,
      message: 'Application submitted. Verification in 24 hours.',
      rider: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Login Rider ──────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM riders WHERE email=$1', [email]);
    if (!result.rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const rider = result.rows[0];
    const match = await bcrypt.compare(password, rider.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!rider.is_verified) return res.status(403).json({ success: false, message: 'Pending verification' });

    const token = jwt.sign(
      { id: rider.id, role: 'rider', email: rider.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password_hash, ...safe } = rider;
    res.json({ success: true, token, rider: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Toggle Online Status ─────────────────────────────────
router.patch('/online', auth(['rider']), async (req, res) => {
  const { latitude, longitude } = req.body;
  try {
    const result = await db.query(
      `UPDATE riders SET is_online = NOT is_online,
       current_latitude=$1, current_longitude=$2, updated_at=NOW()
       WHERE id=$3 RETURNING is_online`,
      [latitude, longitude, req.user.id]
    );
    res.json({ success: true, is_online: result.rows[0].is_online });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Update Rider Location ────────────────────────────────
router.patch('/location', auth(['rider']), async (req, res) => {
  const { latitude, longitude } = req.body;
  try {
    await db.query(
      'UPDATE riders SET current_latitude=$1, current_longitude=$2, updated_at=NOW() WHERE id=$3',
      [latitude, longitude, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Rider Earnings ───────────────────────────────────────
router.get('/earnings', auth(['rider']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [todayData, weekData, totalData] = await Promise.all([
      db.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(rider_payout),0) as earnings
         FROM orders WHERE rider_id=$1 AND DATE(delivered_at)=$2 AND status='delivered'`,
        [req.user.id, today]
      ),
      db.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(rider_payout),0) as earnings
         FROM orders WHERE rider_id=$1 AND delivered_at >= NOW()-INTERVAL '7 days' AND status='delivered'`,
        [req.user.id]
      ),
      db.query(
        `SELECT total_deliveries, wallet_balance, rating FROM riders WHERE id=$1`, [req.user.id]
      ),
    ]);
    res.json({
      success: true,
      earnings: {
        today_deliveries: parseInt(todayData.rows[0].count),
        today_earnings: parseFloat(todayData.rows[0].earnings),
        week_deliveries: parseInt(weekData.rows[0].count),
        week_earnings: parseFloat(weekData.rows[0].earnings),
        total_deliveries: totalData.rows[0].total_deliveries,
        wallet_balance: parseFloat(totalData.rows[0].wallet_balance),
        rating: parseFloat(totalData.rows[0].rating),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
