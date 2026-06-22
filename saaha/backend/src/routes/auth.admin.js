const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── Admin Login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM admins WHERE email=$1 AND is_active=true', [email]);
    if (!result.rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const admin = result.rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin.id, role: 'admin', adminRole: admin.role, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    const { password_hash, ...safe } = admin;
    res.json({ success: true, token, admin: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Create new admin (super_admin only) ──────────────────
router.post('/create', auth(['admin']), async (req, res) => {
  if (req.user.adminRole !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only super admins can create admin accounts' });
  }
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO admins (name,email,password_hash,role) VALUES ($1,$2,$3,$4)
       RETURNING id,name,email,role,created_at`,
      [name, email, hash, role || 'admin']
    );
    res.status(201).json({ success: true, admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get own profile ───────────────────────────────────────
router.get('/me', auth(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id,name,email,role,created_at FROM admins WHERE id=$1', [req.user.id]
    );
    res.json({ success: true, admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
