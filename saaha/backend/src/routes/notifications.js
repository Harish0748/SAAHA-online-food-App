const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── Get My Notifications ─────────────────────────────────
router.get('/', auth(['customer', 'restaurant', 'rider']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications WHERE user_id=$1 AND user_type=$2
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id, req.user.role]
    );
    res.json({ success: true, notifications: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Mark as Read ─────────────────────────────────────────
router.patch('/:id/read', auth(['customer', 'restaurant', 'rider']), async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
