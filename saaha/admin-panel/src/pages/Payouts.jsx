import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const { data } = await api.get('/admin/payouts', { params });
      setPayouts(data.payouts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const markProcessed = async (id) => {
    const utr = prompt('Enter UTR / transaction reference number:');
    if (!utr) return;
    await api.patch(`/admin/payouts/${id}/process`, { utr_number: utr });
    load();
  };

  return (
    <>
      <h1 className="page-title">Payout reports</h1>
      <p className="page-sub">Weekly restaurant payouts after 10% commission deduction</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Payout records are generated weekly by running <code>node src/utils/generatePayouts.js</code> on the backend
          (set up as a cron job, e.g. every Monday). Once a restaurant's bank transfer is completed manually,
          mark it processed here with the UTR number for record-keeping.
        </p>
      </div>

      <div className="tabs-row">
        {['', 'pending', 'processed', 'failed'].map((s) => (
          <button key={s || 'all'} className={`tab-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : payouts.length === 0 ? (
          <div className="empty-state">No payout records yet. Run the payout generator script to create this week's batch.</div>
        ) : (
          <table>
            <thead><tr><th>Restaurant</th><th>Week</th><th>Orders</th><th>Gross revenue</th><th>Commission</th><th>Net payout</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>{p.restaurant_name}</td>
                  <td>{new Date(p.week_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {new Date(p.week_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td>{p.total_orders}</td>
                  <td>₹{parseFloat(p.gross_revenue).toLocaleString('en-IN')}</td>
                  <td>₹{parseFloat(p.commission_deducted).toLocaleString('en-IN')}</td>
                  <td><strong>₹{parseFloat(p.net_payout).toLocaleString('en-IN')}</strong></td>
                  <td>
                    <span className={`badge ${p.payout_status === 'processed' ? 'green' : p.payout_status === 'failed' ? 'red' : 'yellow'}`}>
                      {p.payout_status}
                    </span>
                  </td>
                  <td>
                    {p.payout_status === 'pending' && (
                      <button className="btn small success" onClick={() => markProcessed(p.id)}>Mark paid</button>
                    )}
                    {p.payout_status === 'processed' && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>UTR: {p.utr_number}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
