const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── Add Category ─────────────────────────────────────────
router.post('/category', auth(['restaurant']), async (req, res) => {
  const { name, display_order } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO categories (restaurant_id,name,display_order) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, name, display_order || 0]
    );
    res.status(201).json({ success: true, category: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get My Menu ──────────────────────────────────────────
router.get('/my', auth(['restaurant']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id as category_id, c.name as category_name,
              json_agg(m ORDER BY m.display_order) as items
       FROM categories c
       LEFT JOIN menu_items m ON m.category_id=c.id
       WHERE c.restaurant_id=$1 AND c.is_active=true
       GROUP BY c.id ORDER BY c.display_order`,
      [req.user.id]
    );
    res.json({ success: true, menu: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Add Menu Item ────────────────────────────────────────
router.post('/item', auth(['restaurant']), async (req, res) => {
  const {
    category_id, name, description, price, discounted_price,
    is_veg, preparation_time, calories, allergens,
  } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO menu_items
         (restaurant_id, category_id, name, description, price, discounted_price,
          is_veg, preparation_time, calories, allergens)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, category_id, name, description, price, discounted_price,
       is_veg !== false, preparation_time || 20, calories, allergens]
    );
    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Update Menu Item ─────────────────────────────────────
router.put('/item/:id', auth(['restaurant']), async (req, res) => {
  const { name, description, price, discounted_price, is_available } = req.body;
  try {
    const result = await db.query(
      `UPDATE menu_items SET name=$1, description=$2, price=$3,
       discounted_price=$4, is_available=$5, updated_at=NOW()
       WHERE id=$6 AND restaurant_id=$7 RETURNING *`,
      [name, description, price, discounted_price, is_available, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Toggle Item Availability ─────────────────────────────
router.patch('/item/:id/toggle', auth(['restaurant']), async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE menu_items SET is_available = NOT is_available, updated_at=NOW()
       WHERE id=$1 AND restaurant_id=$2 RETURNING id, is_available`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Delete Menu Item ─────────────────────────────────────
router.delete('/item/:id', auth(['restaurant']), async (req, res) => {
  try {
    await db.query(
      'DELETE FROM menu_items WHERE id=$1 AND restaurant_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
