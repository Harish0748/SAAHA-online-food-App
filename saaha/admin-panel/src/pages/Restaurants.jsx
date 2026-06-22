import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const { data } = await api.get('/admin/restaurants', { params });
      setRestaurants(data.restaurants);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const verify = async (id) => {
    await api.patch(`/admin/restaurants/${id}/verify`);
    load();
  };
  const reject = async (id) => {
    if (!confirm('Reject this restaurant application?')) return;
    await api.patch(`/admin/restaurants/${id}/reject`);
    load();
  };
  const toggleSuspend = async (id) => {
    await api.patch(`/admin/restaurants/${id}/suspend`);
    load();
  };

  return (
    <>
      <h1 className="page-title">Restaurants</h1>
      <p className="page-sub">Verify applications, manage active partners</p>

      <div className="tabs-row">
        {['all', 'pending', 'verified'].map((f) => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending verification' : 'Verified'}
          </button>
        ))}
      </div>

      <div className="search-bar">
        <input placeholder="Search by restaurant name…" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button className="btn" onClick={load}>Search</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : restaurants.length === 0 ? (
          <div className="empty-state">No restaurants found.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Restaurant</th><th>Owner</th><th>City</th><th>Plan</th><th>Status</th><th>Rating</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td>{r.restaurant_name}</td>
                  <td>{r.owner_name}<br /><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.owner_phone}</span></td>
                  <td>{r.city}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.subscription_type || '—'}</td>
                  <td>
                    {!r.is_verified && <span className="badge yellow">Pending</span>}
                    {r.is_verified && r.is_active && <span className="badge green">Active</span>}
                    {r.is_verified && !r.is_active && <span className="badge red">Suspended</span>}
                  </td>
                  <td>{r.rating ? `⭐ ${r.rating}` : '—'}</td>
                  <td>
                    {!r.is_verified ? (
                      <>
                        <button className="btn small success" onClick={() => verify(r.id)} style={{ marginRight: 6 }}>Verify</button>
                        <button className="btn small danger" onClick={() => reject(r.id)}>Reject</button>
                      </>
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
