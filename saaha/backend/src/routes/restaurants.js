const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── List Restaurants (with city filter + search) ─────────
router.get('/', async (req, res) => {
  const { city, search, cuisine, veg_only, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT id, restaurant_name, description, cuisine_types, logo_url, cover_image_url,
             address, city, avg_prep_time, is_veg_only, rating, total_ratings
      FROM restaurants
      WHERE is_active=true AND is_open=true AND subscription_status='active'
    `;
    const params = [];
    let idx = 1;

    if (city) { query += ` AND city ILIKE $${idx++}`; params.push(`%${city}%`); }
    if (search) { query += ` AND restaurant_name ILIKE $${idx++}`; params.push(`%${search}%`); }
    if (veg_only === 'true') { query += ` AND is_veg_only=true`; }

    query += ` ORDER BY rating DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({ success: true, restaurants: result.rows, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get Single Restaurant ────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [restaurant, categories] = await Promise.all([
      db.query(
        `SELECT id, restaurant_name, description, cuisine_types, logo_url, cover_image_url,
                address, city, opening_time, closing_time, avg_prep_time, is_veg_only,
                rating, total_ratings, is_open
         FROM restaurants WHERE id=$1 AND is_active=true`, [req.params.id]
      ),
      db.query(
        `SELECT c.id, c.name,
                json_agg(m ORDER BY m.display_order) as items
         FROM categories c
         LEFT JOIN menu_items m ON m.category_id=c.id AND m.is_available=true
         WHERE c.restaurant_id=$1 AND c.is_active=true
         GROUP BY c.id ORDER BY c.display_order`, [req.params.id]
      ),
    ]);

    if (!restaurant.rows.length) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    res.json({
      success: true,
      restaurant: restaurant.rows[0],
      menu: categories.rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
