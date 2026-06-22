/**
 * Weekly Payout Generator
 * ------------------------
 * Calculates each restaurant's net payout for the past 7 days and inserts
 * rows into the `payouts` table for the admin Payout Reports screen.
 *
 * Run manually:   node src/utils/generatePayouts.js
 * Run via cron:    0 6 * * 1  node /path/to/backend/src/utils/generatePayouts.js   (every Monday 6am)
 */
require('dotenv').config();
const db = require('../config/db');

async function generateWeeklyPayouts() {
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  console.log(`📊 Generating payouts for ${weekStart.toDateString()} → ${weekEnd.toDateString()}`);

  try {
    const restaurants = await db.query(
      `SELECT DISTINCT restaurant_id FROM orders
       WHERE status='delivered' AND delivered_at BETWEEN $1 AND $2`,
      [weekStart, weekEnd]
    );

    let count = 0;
    for (const row of restaurants.rows) {
      const restaurantId = row.restaurant_id;

      const summary = await db.query(
        `SELECT COUNT(*) as total_orders,
                COALESCE(SUM(item_total),0) as gross_revenue,
                COALESCE(SUM(commission_amount),0) as commission_deducted,
                COALESCE(SUM(restaurant_payout),0) as net_payout
         FROM orders
         WHERE restaurant_id=$1 AND status='delivered' AND delivered_at BETWEEN $2 AND $3`,
        [restaurantId, weekStart, weekEnd]
      );

      const s = summary.rows[0];

      // Avoid duplicate payout rows for the same week
      const existing = await db.query(
        `SELECT id FROM payouts WHERE restaurant_id=$1 AND week_start=$2`,
        [restaurantId, weekStart.toISOString().split('T')[0]]
      );
      if (existing.rows.length) continue;

      await db.query(
        `INSERT INTO payouts
           (restaurant_id, week_start, week_end, total_orders, gross_revenue, commission_deducted, net_payout, payout_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
        [
          restaurantId,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0],
          s.total_orders, s.gross_revenue, s.commission_deducted, s.net_payout,
        ]
      );
      count++;
    }

    console.log(`✅ Generated ${count} payout records.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Payout generation failed:', err);
    process.exit(1);
  }
}

generateWeeklyPayouts();
