const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

const adminOnly = auth(['admin']);

// =========================================================
// DASHBOARD / ANALYTICS
// =========================================================
router.get('/analytics/overview', adminOnly, async (req, res) => {
  try {
    const [users, restaurants, riders, orders, revenue, todayOrders] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query(`SELECT COUNT(*) FILTER (WHERE is_verified) as verified,
                        COUNT(*) FILTER (WHERE NOT is_verified) as pending,
                        COUNT(*) FILTER (WHERE subscription_status='active') as active_subs
                 FROM restaurants`),
      db.query(`SELECT COUNT(*) FILTER (WHERE is_verified) as verified,
                        COUNT(*) FILTER (WHERE NOT is_verified) as pending,
                        COUNT(*) FILTER (WHERE is_online) as online
                 FROM riders`),
      db.query(`SELECT COUNT(*) FILTER (WHERE status='delivered') as completed,
                        COUNT(*) FILTER (WHERE status NOT IN ('delivered','cancelled')) as active,
                        COUNT(*) FILTER (WHERE status='cancelled') as cancelled
                 FROM orders`),
      db.query(`SELECT COALESCE(SUM(commission_amount),0) as total_commission,
                        COALESCE(SUM(total_amount),0) as total_gmv
                 FROM orders WHERE status='delivered'`),
      db.query(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as gmv
                 FROM orders WHERE DATE(placed_at)=CURRENT_DATE`),
    ]);

    const subRevenue = await db.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM subscriptions WHERE payment_status='paid'`
    );

    res.json({
      success: true,
      overview: {
        total_customers: parseInt(users.rows[0].count),
        restaurants: {
          verified: parseInt(restaurants.rows[0].verified),
          pending_verification: parseInt(restaurants.rows[0].pending),
          active_subscriptions: parseInt(restaurants.rows[0].active_subs),
        },
        riders: {
          verified: parseInt(riders.rows[0].verified),
          pending_verification: parseInt(riders.rows[0].pending),
          online_now: parseInt(riders.rows[0].online),
        },
        orders: {
          completed: parseInt(orders.rows[0].completed),
          active: parseInt(orders.rows[0].active),
          cancelled: parseInt(orders.rows[0].cancelled),
        },
        revenue: {
          total_commission_earned: parseFloat(revenue.rows[0].total_commission),
          total_gmv: parseFloat(revenue.rows[0].total_gmv),
          total_subscription_revenue: parseFloat(subRevenue.rows[0].total),
        },
        today: {
          orders: parseInt(todayOrders.rows[0].count),
          gmv: parseFloat(todayOrders.rows[0].gmv),
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Revenue trend (last 30 days) for charts
router.get('/analytics/revenue-trend', adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DATE(placed_at) as date,
             COUNT(*) as orders,
             COALESCE(SUM(total_amount),0) as gmv,
             COALESCE(SUM(commission_amount),0) as commission
      FROM orders
      WHERE placed_at >= NOW() - INTERVAL '30 days' AND status='delivered'
      GROUP BY DATE(placed_at) ORDER BY date ASC
    `);
    res.json({ success: true, trend: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Top restaurants by revenue
router.get('/analytics/top-restaurants', adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.id, r.restaurant_name, r.city, r.rating,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(o.total_amount),0) as gmv,
             COALESCE(SUM(o.commission_amount),0) as commission_generated
      FROM restaurants r
      LEFT JOIN orders o ON o.restaurant_id=r.id AND o.status='delivered'
      GROUP BY r.id ORDER BY gmv DESC LIMIT 10
    `);
    res.json({ success: true, restaurants: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =========================================================
// MANAGE USERS (customers)
// =========================================================
router.get('/users', adminOnly, async (req, res) => {
  const { search, page = 1, limit = 25 } = req.query;
  try {
    let query = 'SELECT id,name,email,phone,is_active,created_at FROM users WHERE 1=1';
    const params = [];
    let idx = 1;
    if (search) { query += ` AND (name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, (page - 1) * limit);
    const result = await db.query(query, params);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/users/:id/suspend', adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active',
      [req.params.id]
    );
    res.json({ success: true, ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =========================================================
// MANAGE RESTAURANTS
// =========================================================
router.get('/restaurants', adminOnly, async (req, res) => {
  const { status, search, page = 1, limit = 25 } = req.query;
  try {
    let query = `SELECT id, restaurant_name, owner_name, owner_email, owner_phone, city,
                        is_verified, is_active, is_open, subscription_type, subscription_status,
                        rating, created_at,
                        EXISTS (SELECT 1 FROM subscriptions s WHERE s.restaurant_id = restaurants.id AND s.payment_status='paid' AND s.is_active = TRUE) AS has_paid_subscription
                 FROM restaurants WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (status === 'pending') { query += ` AND is_verified=false`; }
    if (status === 'verified') { query += ` AND is_verified=true`; }
    if (search) { query += ` AND restaurant_name ILIKE $${idx}`; params.push(`%${search}%`); idx++; }
    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, (page - 1) * limit);
    const result = await db.query(query, params);
    res.json({ success: true, restaurants: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve / verify a restaurant
router.patch('/restaurants/:id/verify', adminOnly, async (req, res) => {
  try {
    // Ensure the restaurant exists
    const r = await db.query('SELECT subscription_status FROM restaurants WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    // Require a paid subscription OR an active subscription_status on the restaurant before verification
    const subStatus = r.rows[0].subscription_status;
    const paidCheck = await db.query(
      `SELECT COUNT(*)::int as count FROM subscriptions WHERE restaurant_id=$1 AND payment_status='paid' AND is_active=TRUE`,
      [req.params.id]
    );
    const hasPaid = (paidCheck.rows[0] && parseInt(paidCheck.rows[0].count, 10) > 0) || subStatus === 'active';
    if (!hasPaid) {
      return res.status(400).json({
        success: false,
        message: 'Cannot verify restaurant — no paid subscription found. Please ensure subscription payment is completed before verification.'
      });
    }

    const result = await db.query(
      'UPDATE restaurants SET is_verified=true, updated_at=NOW() WHERE id=$1 RETURNING id, restaurant_name, is_verified',
      [req.params.id]
    );
    res.json({ success: true, restaurant: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get recent subscriptions for a restaurant (admin view)
router.get('/restaurants/:id/subscriptions', adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, plan_type, amount, start_date, end_date, payment_id, payment_status, is_active, created_at
       FROM subscriptions WHERE restaurant_id=$1 ORDER BY start_date DESC LIMIT 20`,
      [req.params.id]
    );
    res.json({ success: true, subscriptions: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject a restaurant application
router.patch('/restaurants/:id/reject', adminOnly, async (req, res) => {
  try {
    await db.query(
      `UPDATE restaurants SET is_verified=false, is_active=false, updated_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Restaurant application rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Suspend / unsuspend a restaurant
router.patch('/restaurants/:id/suspend', adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE restaurants SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active',
      [req.params.id]
    );
    res.json({ success: true, ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Restaurant payout report
router.get('/restaurants/:id/payouts', adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM payouts WHERE restaurant_id=$1 ORDER BY week_start DESC LIMIT 20`,
      [req.params.id]
    );
    res.json({ success: true, payouts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =========================================================
// MANAGE DELIVERY PARTNERS (riders)
// =========================================================
router.get('/riders', adminOnly, async (req, res) => {
  const { status, search, page = 1, limit = 25 } = req.query;
  try {
    let query = `SELECT id, name, email, phone, vehicle_type, vehicle_number,
                        is_verified, is_active, is_online, rating, total_deliveries,
                        wallet_balance, created_at
                 FROM riders WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (status === 'pending') { query += ` AND is_verified=false`; }
    if (status === 'verified') { query += ` AND is_verified=true`; }
    if (search) { query += ` AND name ILIKE $${idx}`; params.push(`%${search}%`); idx++; }
    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, (page - 1) * limit);
    const result = await db.query(query, params);
    res.json({ success: true, riders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/riders/:id/verify', adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE riders SET is_verified=true, updated_at=NOW() WHERE id=$1 RETURNING id, name, is_verified',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, rider: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/riders/:id/suspend', adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE riders SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active',
      [req.params.id]
    );
    res.json({ success: true, ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// All payouts across restaurants (admin payout report screen)
router.get('/payouts', adminOnly, async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query;
  try {
    let query = `
      SELECT p.*, r.restaurant_name
      FROM payouts p JOIN restaurants r ON r.id=p.restaurant_id
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (status) { query += ` AND p.payout_status=$${idx}`; params.push(status); idx++; }
    query += ` ORDER BY p.week_start DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, (page - 1) * limit);
    const result = await db.query(query, params);
    res.json({ success: true, payouts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark a payout as processed (after manually transferring funds via bank/UPI)
router.patch('/payouts/:id/process', adminOnly, async (req, res) => {
  const { utr_number } = req.body;
  try {
    const result = await db.query(
      `UPDATE payouts SET payout_status='processed', payout_date=NOW(), utr_number=$1
       WHERE id=$2 RETURNING *`,
      [utr_number, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Payout not found' });
    res.json({ success: true, payout: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =========================================================
// COMMISSION / PLATFORM SETTINGS
// =========================================================
router.get('/settings', adminOnly, async (req, res) => {
  try {
    const result = await db.query('SELECT key, value, updated_at FROM platform_settings ORDER BY key');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings, raw: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/settings/:key', adminOnly, async (req, res) => {
  const { value } = req.body;
  if (req.user.adminRole !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only super admins can change platform settings' });
  }
  try {
    const result = await db.query(
      `UPDATE platform_settings SET value=$1, updated_by=$2, updated_at=NOW()
       WHERE key=$3 RETURNING key, value`,
      [value, req.user.id, req.params.key]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Setting not found' });
    res.json({ success: true, setting: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =========================================================
// ALL ORDERS (admin view)
// =========================================================
router.get('/orders', adminOnly, async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query;
  try {
    let query = `
      SELECT o.id, o.order_number, o.status, o.total_amount, o.commission_amount,
             o.placed_at, r.restaurant_name, u.name as customer_name, ri.name as rider_name
      FROM orders o
      JOIN restaurants r ON r.id=o.restaurant_id
      JOIN users u ON u.id=o.user_id
      LEFT JOIN riders ri ON ri.id=o.rider_id
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (status) { query += ` AND o.status=$${idx}`; params.push(status); idx++; }
    query += ` ORDER BY o.placed_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, (page - 1) * limit);
    const result = await db.query(query, params);
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
