import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const { data } = await api.get('/admin/riders', { params });
      setRiders(data.riders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const verify = async (id) => {
    await api.patch(`/admin/riders/${id}/verify`);
    load();
  };
  const toggleSuspend = async (id) => {
    await api.patch(`/admin/riders/${id}/suspend`);
    load();
  };

  return (
    <>
      <h1 className="page-title">Delivery partners</h1>
      <p className="page-sub">Verify riders, monitor earnings and activity</p>

      <div className="tabs-row">
        {['all', 'pending', 'verified'].map((f) => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending verification' : 'Verified'}
          </button>
        ))}
      </div>

      <div className="search-bar">
        <input placeholder="Search by rider name…" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button className="btn" onClick={load}>Search</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : riders.length === 0 ? (
          <div className="empty-state">No riders found.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Vehicle</th><th>Status</th><th>Online</th><th>Deliveries</th><th>Wallet</th><th>Rating</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {riders.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}<br /><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.phone}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{r.vehicle_type || '—'} {r.vehicle_number && `(${r.vehicle_number})`}</td>
                  <td>
                    {!r.is_verified && <span className="badge yellow">Pending</span>}
                    {r.is_verified && r.is_active && <span className="badge green">Active</span>}
                    {r.is_verified && !r.is_active && <span className="badge red">Suspended</span>}
                  </td>
                  <td>{r.is_online ? <span className="badge blue">Online</span> : <span className="badge gray">Offline</span>}</td>
                  <td>{r.total_deliveries}</td>
                  <td>₹{parseFloat(r.wallet_balance).toLocaleString('en-IN')}</td>
                  <td>{r.rating ? `⭐ ${r.rating}` : '—'}</td>
                  <td>
                    {!r.is_verified ? (
                      <button className="btn small success" onClick={() => verify(r.id)}>Verify</button>
                    ) : (
                      <button className="btn small secondary" onClick={() => toggleSuspend(r.id)}>
                        {r.is_active ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
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
