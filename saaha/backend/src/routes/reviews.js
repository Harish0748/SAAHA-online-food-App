const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── Submit Review ────────────────────────────────────────
router.post('/', auth(['customer']), async (req, res) => {
  const { order_id, restaurant_rating, rider_rating, food_rating, comment } = req.body;
  try {
    const order = await db.query(
      'SELECT * FROM orders WHERE id=$1 AND user_id=$2 AND status=$3',
      [order_id, req.user.id, 'delivered']
    );
    if (!order.rows.length) {
      return res.status(400).json({ success: false, message: 'Can only review delivered orders' });
    }
    const o = order.rows[0];

    await db.query(
      `INSERT INTO reviews (order_id,user_id,restaurant_id,rider_id,restaurant_rating,rider_rating,food_rating,comment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [order_id, req.user.id, o.restaurant_id, o.rider_id, restaurant_rating, rider_rating, food_rating, comment]
    );

    // Update restaurant rating
    await db.query(
      `UPDATE restaurants SET
         rating = (SELECT AVG(restaurant_rating)::DECIMAL(3,2) FROM reviews WHERE restaurant_id=$1),
         total_ratings = (SELECT COUNT(*) FROM reviews WHERE restaurant_id=$1)
       WHERE id=$1`, [o.restaurant_id]
    );

    // Update rider rating
    if (o.rider_id) {
      await db.query(
        `UPDATE riders SET
           rating = (SELECT AVG(rider_rating)::DECIMAL(3,2) FROM reviews WHERE rider_id=$1)
         WHERE id=$1`, [o.rider_id]
      );
    }

    res.status(201).json({ success: true, message: 'Review submitted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get Restaurant Reviews ───────────────────────────────
router.get('/restaurant/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.name as customer_name FROM reviews r
       JOIN users u ON u.id=r.user_id
       WHERE r.restaurant_id=$1 ORDER BY r.created_at DESC LIMIT 20`,
      [req.params.id]
    );
    res.json({ success: true, reviews: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
