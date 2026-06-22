import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client.js';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topRestaurants, setTopRestaurants] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [o, t, tr] = await Promise.all([
          api.get('/admin/analytics/overview'),
          api.get('/admin/analytics/revenue-trend'),
          api.get('/admin/analytics/top-restaurants'),
        ]);
        setOverview(o.data.overview);
        setTrend(t.data.trend.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), gmv: parseFloat(d.gmv) })));
        setTopRestaurants(tr.data.restaurants);
      } catch (err) {
        setError('Could not load analytics. Is the backend running?');
      }
    })();
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!overview) return <div className="empty-state">Loading…</div>;

  return (
    <>
      <h1 className="page-title">Platform overview</h1>
      <p className="page-sub">Live snapshot across customers, restaurants, riders and orders</p>

      <div className="stats-row">
        <div className="stat-card">
          <div className="label">Total customers</div>
          <div className="value">{overview.total_customers}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active restaurants</div>
          <div className="value">{overview.restaurants.active_subscriptions}</div>
          <div className="sub">{overview.restaurants.pending_verification} pending verification</div>
        </div>
        <div className="stat-card">
          <div className="label">Online riders</div>
          <div className="value">{overview.riders.online_now}</div>
          <div className="sub">{overview.riders.pending_verification} pending verification</div>
        </div>
        <div className="stat-card">
          <div className="label">Today's orders</div>
          <div className="value">{overview.today.orders}</div>
          <div className="sub">₹{overview.today.gmv.toLocaleString('en-IN')} GMV</div>
        </div>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="label">Total commission earned</div>
          <div className="value">₹{overview.revenue.total_commission_earned.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total subscription revenue</div>
          <div className="value">₹{overview.revenue.total_subscription_revenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total GMV (delivered orders)</div>
          <div className="value">₹{overview.revenue.total_gmv.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="card">
        <h3>GMV trend — last 30 days</h3>
        {trend.length === 0 ? (
          <div className="empty-state">No delivered orders yet to chart.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="gmv" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3>Top restaurants by revenue</h3>
        {topRestaurants.length === 0 ? (
          <div className="empty-state">No order data yet.</div>
        ) : (
          <table>
            <thead><tr><th>Restaurant</th><th>City</th><th>Orders</th><th>GMV</th><th>Commission generated</th></tr></thead>
            <tbody>
              {topRestaurants.map((r) => (
                <tr key={r.id}>
                  <td>{r.restaurant_name}</td>
                  <td>{r.city}</td>
                  <td>{r.total_orders}</td>
                  <td>₹{parseFloat(r.gmv).toLocaleString('en-IN')}</td>
                  <td>₹{parseFloat(r.commission_generated).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
