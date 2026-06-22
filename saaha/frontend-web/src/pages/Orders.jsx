import { useEffect, useState } from 'react';
import api from '../api/client.js';

const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/orders/restaurant/active');
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  const advance = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update order');
    }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this order?')) return;
    await advance(id, 'cancelled');
  };

  if (loading) return <div className="empty-state">Loading orders…</div>;

  return (
    <>
      <h1 className="page-title">Live orders</h1>
      <p className="page-sub">Auto-refreshes every 10 seconds</p>

      {orders.length === 0 ? (
        <div className="card"><div className="empty-state">No active orders right now.</div></div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{o.customer_name}<br /><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{o.customer_phone}</span></td>
                  <td>{(typeof o.items === 'string' ? JSON.parse(o.items) : o.items).map(i => `${i.name} ×${i.quantity}`).join(', ')}</td>
                  <td>₹{o.total_amount}</td>
                  <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                  <td>
                    {NEXT_STATUS[o.status] && (
                      <button className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 12, marginRight: 6 }}
                        onClick={() => advance(o.id, NEXT_STATUS[o.status])}>
                        Mark {NEXT_STATUS[o.status]}
                      </button>
                    )}
                    {['pending', 'confirmed'].includes(o.status) && (
                      <button className="btn secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                        onClick={() => cancel(o.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
