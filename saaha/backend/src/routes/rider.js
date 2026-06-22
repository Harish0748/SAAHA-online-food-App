const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── Get My Active Delivery ───────────────────────────────
router.get('/active', auth(['rider']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, r.restaurant_name, r.address as restaurant_address,
              r.latitude as restaurant_lat, r.longitude as restaurant_lng,
              u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN restaurants r ON r.id=o.restaurant_id
       JOIN users u ON u.id=o.user_id
       WHERE o.rider_id=$1 AND o.status IN ('ready','picked_up')
       ORDER BY o.placed_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.json({ success: true, order: null });
    const { otp, ...order } = result.rows[0];
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get Delivery History ─────────────────────────────────
router.get('/history', auth(['rider']), async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  try {
    const result = await db.query(
      `SELECT o.id, o.order_number, o.rider_payout, o.delivered_at, r.restaurant_name
       FROM orders o JOIN restaurants r ON r.id=o.restaurant_id
       WHERE o.rider_id=$1 AND o.status='delivered'
       ORDER BY o.delivered_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, (page - 1) * limit]
    );
    res.json({ success: true, deliveries: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Accept/Reject Delivery Assignment ────────────────────
router.patch('/:orderId/respond', auth(['rider']), async (req, res) => {
  const { accept } = req.body;
  try {
    if (!accept) {
      // Unassign so another rider can be matched
      await db.query(
        'UPDATE orders SET rider_id=NULL WHERE id=$1 AND rider_id=$2',
        [req.params.orderId, req.user.id]
      );
      return res.json({ success: true, message: 'Delivery declined' });
    }
    res.json({ success: true, message: 'Delivery accepted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
