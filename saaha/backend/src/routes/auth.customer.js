const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── Register Customer ────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, phone, password } = req.body;
  try {
    const exists = await db.query(
      'SELECT id FROM users WHERE email=$1 OR phone=$2', [email, phone]
    );
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: 'Email or phone already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1,$2,$3,$4) RETURNING id, name, email, phone, created_at`,
      [name, email, phone, hash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: 'customer', email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Login Customer ───────────────────────────────────────
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email=$1 AND is_active=true', [email]
    );
    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: 'customer', email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get Profile ──────────────────────────────────────────
router.get('/me', auth(['customer']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone, profile_image, default_address, created_at
       FROM users WHERE id=$1`, [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Update Profile ───────────────────────────────────────
router.put('/me', auth(['customer']), async (req, res) => {
  const { name, phone } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET name=$1, phone=$2, updated_at=NOW()
       WHERE id=$3 RETURNING id, name, email, phone`,
      [name, phone, req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Add Address ──────────────────────────────────────────
router.post('/address', auth(['customer']), async (req, res) => {
  const { label, flat, street, landmark, city, state, pincode, latitude, longitude, is_default } = req.body;
  try {
    if (is_default) {
      await db.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
    }
    const result = await db.query(
      `INSERT INTO addresses (user_id,label,flat,street,landmark,city,state,pincode,latitude,longitude,is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.id, label, flat, street, landmark, city, state, pincode, latitude, longitude, is_default || false]
    );
    res.status(201).json({ success: true, address: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get Addresses ────────────────────────────────────────
router.get('/addresses', auth(['customer']), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC', [req.user.id]
    );
    res.json({ success: true, addresses: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
