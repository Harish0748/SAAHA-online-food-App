const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const auth = require('../middleware/auth');

// Fallback defaults if platform_settings table is empty/unreachable
const DEFAULTS = {
  delivery_fee: parseFloat(process.env.DELIVERY_FEE || 40),
  commission_rate: parseFloat(process.env.COMMISSION_RATE || 0.10),
  rider_payout_per_delivery: 32,
};

// ── Load live settings from admin-configurable platform_settings table ──
async function getSettings() {
  try {
    const result = await db.query(
      `SELECT key, value FROM platform_settings
       WHERE key IN ('delivery_fee','commission_rate','rider_payout_per_delivery')`
    );
    const settings = { ...DEFAULTS };
    result.rows.forEach(r => {
      settings[r.key] = parseFloat(r.value);
    });
    return settings;
  } catch (err) {
    console.error('Could not load platform settings, using defaults:', err.message);
    return DEFAULTS;
  }
}

// ── Generate OTP ─────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Generate Order Number ────────────────────────────────
const generateOrderNumber = () => `SAH${Date.now().toString().slice(-8)}`;

// ── Get current live pricing (for cart preview before checkout) ──
router.get('/pricing/current', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      success: true,
      pricing: {
        delivery_fee: settings.delivery_fee,
        commission_rate: settings.commission_rate,
        platform_fee: 0,
        handling_fee: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Place Order ──────────────────────────────────────────
router.post('/', auth(['customer']), async (req, res) => {
  const { restaurant_id, items, delivery_address, payment_method, delivery_instructions } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ success: false, message: 'No items in order' });
  }

  try {
    const { delivery_fee: DELIVERY_FEE, commission_rate: COMMISSION_RATE, rider_payout_per_delivery: RIDER_PAYOUT } = await getSettings();

    // Verify restaurant is active
    const restaurant = await db.query(
      `SELECT id, avg_prep_time, subscription_status FROM restaurants
       WHERE id=$1 AND is_active=true AND is_open=true AND subscription_status='active'`,
      [restaurant_id]
    );
    if (!restaurant.rows.length) {
      return res.status(400).json({ success: false, message: 'Restaurant not available' });
    }

    // Verify menu items and calculate total
    const itemIds = items.map(i => i.id);
    const menuItems = await db.query(
      'SELECT id, name, price, discounted_price, is_available FROM menu_items WHERE id=ANY($1) AND restaurant_id=$2',
      [itemIds, restaurant_id]
    );

    const menuMap = {};
    menuItems.rows.forEach(m => { menuMap[m.id] = m; });

    let itemTotal = 0;
    const orderItems = items.map(item => {
      const menuItem = menuMap[item.id];
      if (!menuItem || !menuItem.is_available) throw new Error(`Item unavailable: ${item.id}`);
      const price = parseFloat(menuItem.discounted_price || menuItem.price);
      itemTotal += price * item.quantity;
      return {
        id: item.id,
        name: menuItem.name,
        price,
        quantity: item.quantity,
        subtotal: price * item.quantity,
      };
    });

    const totalAmount = itemTotal + DELIVERY_FEE; // platform_fee=0, handling_fee=0
    const commissionAmount = itemTotal * COMMISSION_RATE;
    const restaurantPayout = itemTotal - commissionAmount; // restaurant keeps (1 - commission_rate) of item total
    const otp = generateOTP();
    const estimatedTime = new Date(Date.now() + (restaurant.rows[0].avg_prep_time + 15) * 60000);

    const result = await db.query(
      `INSERT INTO orders
         (order_number, user_id, restaurant_id, items, item_total, delivery_fee,
          platform_fee, handling_fee, total_amount, commission_amount, restaurant_payout,
          rider_payout, delivery_address, delivery_instructions, payment_method, otp,
          estimated_delivery_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        generateOrderNumber(), req.user.id, restaurant_id,
        JSON.stringify(orderItems), itemTotal, DELIVERY_FEE,
        0, 0, totalAmount, commissionAmount, restaurantPayout,
        RIDER_PAYOUT, JSON.stringify(delivery_address),
        delivery_instructions, payment_method, otp, estimatedTime,
      ]
    );

    const order = result.rows[0];

    // Notify restaurant via Socket.IO
    const io = req.app.get('io');
    io.to(`restaurant_${restaurant_id}`).emit('new_order', {
      order_id: order.id,
      order_number: order.order_number,
      items: orderItems,
      total: totalAmount,
    });

    // Don't send OTP in response — only send via SMS/notification to customer
    const { otp: _, ...safeOrder } = order;
    res.status(201).json({ success: true, order: safeOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ── Get Customer Orders ──────────────────────────────────
router.get('/my', auth(['customer']), async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const result = await db.query(
      `SELECT o.*, r.restaurant_name, r.logo_url
       FROM orders o JOIN restaurants r ON r.id=o.restaurant_id
       WHERE o.user_id=$1 ORDER BY o.placed_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, (page - 1) * limit]
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Get Single Order ─────────────────────────────────────
router.get('/:id', auth(['customer', 'restaurant', 'rider']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, r.restaurant_name, r.address as restaurant_address,
              ri.name as rider_name, ri.phone as rider_phone,
              ri.current_latitude as rider_lat, ri.current_longitude as rider_lng
       FROM orders o
       JOIN restaurants r ON r.id=o.restaurant_id
       LEFT JOIN riders ri ON ri.id=o.rider_id
       WHERE o.id=$1`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Order not found' });

    // Remove OTP from response
    const { otp, ...order } = result.rows[0];
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Restaurant: Update Order Status ──────────────────────
router.patch('/:id/status', auth(['restaurant', 'rider']), async (req, res) => {
  const { status } = req.body;
  const validTransitions = {
    restaurant: ['confirmed', 'preparing', 'ready', 'cancelled'],
    rider: ['picked_up', 'delivered'],
  };

  if (!validTransitions[req.user.role]?.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status transition' });
  }

  try {
    const timestampField = {
      confirmed: 'confirmed_at',
      preparing: 'preparing_at',
      ready: 'ready_at',
      picked_up: 'picked_up_at',
      delivered: 'delivered_at',
      cancelled: 'cancelled_at',
    }[status];

    const result = await db.query(
      `UPDATE orders SET status=$1, ${timestampField}=NOW(), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Order not found' });

    const order = result.rows[0];
    const io = req.app.get('io');
    io.to(`order_${order.id}`).emit('order_status_update', { status, order_id: order.id });

    // If ready, find nearest rider
    if (status === 'ready') {
      assignRider(order, io);
    }

    // If delivered, update rider stats
    if (status === 'delivered') {
      await db.query(
        'UPDATE riders SET total_deliveries=total_deliveries+1, wallet_balance=wallet_balance+$1 WHERE id=$2',
        [order.rider_payout, order.rider_id]
      );
    }

    const { otp, ...safeOrder } = order;
    res.json({ success: true, order: safeOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Verify OTP on Delivery ───────────────────────────────
router.post('/:id/verify-otp', auth(['rider']), async (req, res) => {
  const { otp } = req.body;
  try {
    const result = await db.query(
      'SELECT otp, status FROM orders WHERE id=$1 AND rider_id=$2',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Order not found' });
    if (result.rows[0].status !== 'picked_up') {
      return res.status(400).json({ success: false, message: 'Order not in transit' });
    }
    if (result.rows[0].otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    res.json({ success: true, message: 'OTP verified. Mark as delivered.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Restaurant Orders ────────────────────────────────────
router.get('/restaurant/active', auth(['restaurant']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone
       FROM orders o JOIN users u ON u.id=o.user_id
       WHERE o.restaurant_id=$1 AND o.status NOT IN ('delivered','cancelled')
       ORDER BY o.placed_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, orders: result.rows.map(o => { const {otp,...r}=o; return r; }) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Auto-assign nearest rider ────────────────────────────
async function assignRider(order, io) {
  try {
    const restaurant = await db.query(
      'SELECT latitude, longitude FROM restaurants WHERE id=$1', [order.restaurant_id]
    );
    const { latitude, longitude } = restaurant.rows[0];

    // Find nearest online rider using Haversine distance approximation
    const riders = await db.query(
      `SELECT id, name,
        (6371 * acos(cos(radians($1)) * cos(radians(current_latitude)) *
        cos(radians(current_longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(current_latitude)))) AS distance
       FROM riders WHERE is_online=true AND is_active=true AND is_verified=true
       ORDER BY distance LIMIT 1`,
      [latitude, longitude]
    );

    if (riders.rows.length) {
      const rider = riders.rows[0];
      await db.query(
        'UPDATE orders SET rider_id=$1 WHERE id=$2', [rider.id, order.id]
      );
      io.to(`rider_${rider.id}`).emit('new_delivery', {
        order_id: order.id,
        order_number: order.order_number,
        restaurant_address: order.restaurant_address,
        delivery_address: order.delivery_address,
        earnings: RIDER_PAYOUT,
      });
    }
  } catch (err) {
    console.error('Rider assignment error:', err);
  }
}

module.exports = router;
