import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const { data } = await api.get('/admin/orders', { params });
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const statuses = ['', 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];

  return (
    <>
      <h1 className="page-title">All orders</h1>
      <p className="page-sub">Platform-wide order monitoring</p>

      <div className="tabs-row">
        {statuses.map((s) => (
          <button key={s || 'all'} className={`tab-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found.</div>
        ) : (
          <table>
            <thead><tr><th>Order #</th><th>Restaurant</th><th>Customer</th><th>Rider</th><th>Total</th><th>Commission</th><th>Status</th><th>Placed</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{o.restaurant_name}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.rider_name || '—'}</td>
                  <td>₹{o.total_amount}</td>
                  <td>₹{parseFloat(o.commission_amount).toFixed(2)}</td>
                  <td><span className={`badge ${o.status === 'delivered' ? 'green' : o.status === 'cancelled' ? 'red' : 'blue'}`}>{o.status}</span></td>
                  <td>{new Date(o.placed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
