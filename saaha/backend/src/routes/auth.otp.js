const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const OTP_EXPIRY_MINUTES = 5;
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Send OTP to phone ────────────────────────────────────
// In production: integrate with an SMS gateway (MSG91, Twilio, etc.)
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit Indian mobile number required' });
  }

  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    // Invalidate previous unused OTPs for this number
    await db.query(
      `UPDATE otp_verifications SET is_used=true WHERE phone=$1 AND is_used=false`, [phone]
    );
    await db.query(
      `INSERT INTO otp_verifications (phone, otp, expires_at) VALUES ($1,$2,$3)`,
      [phone, otp, expiresAt]
    );

    // TODO production: send via SMS gateway. For now, log to server console.
    console.log(`📱 OTP for ${phone}: ${otp} (expires in ${OTP_EXPIRY_MINUTES} min)`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // ⚠️ dev-only convenience field — REMOVE before production
      dev_otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not send OTP' });
  }
});

// ── Verify OTP & login / auto-register ───────────────────
router.post('/verify-otp', async (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP required' });
  }

  try {
    const record = await db.query(
      `SELECT * FROM otp_verifications
       WHERE phone=$1 AND otp=$2 AND is_used=false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, otp]
    );

    if (!record.rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await db.query('UPDATE otp_verifications SET is_used=true WHERE id=$1', [record.rows[0].id]);

    // Find or create user
    let userResult = await db.query('SELECT * FROM users WHERE phone=$1', [phone]);
    let user;

    if (userResult.rows.length) {
      user = userResult.rows[0];
    } else {
      // Auto-register new customer on first OTP login
      const inserted = await db.query(
        `INSERT INTO users (name, email, phone, password_hash)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [
          name || 'SAAHA User',
          `${phone}@otp.saaha.in`, // placeholder unique email since column requires it
          phone,
          'otp_auth_no_password', // OTP-only accounts don't use password auth
        ]
      );
      user = inserted.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, role: 'customer', phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { password_hash, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser, is_new_user: !userResult.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

module.exports = router;
