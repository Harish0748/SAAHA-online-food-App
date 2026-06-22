import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSuspend = async (id) => {
    await api.patch(`/admin/users/${id}/suspend`);
    load();
  };

  return (
    <>
      <h1 className="page-title">Customers</h1>
      <p className="page-sub">Manage registered customer accounts</p>

      <div className="search-bar">
        <input placeholder="Search by name, phone, or email…" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button className="btn" onClick={load}>Search</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : users.length === 0 ? (
          <div className="empty-state">No customers found.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.phone}</td>
                  <td>{u.email?.includes('@otp.saaha.in') ? '— (OTP account)' : u.email}</td>
                  <td>{u.is_active ? <span className="badge green">Active</span> : <span className="badge red">Suspended</span>}</td>
                  <td>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <button className="btn small secondary" onClick={() => toggleSuspend(u.id)}>
                      {u.is_active ? 'Suspend' : 'Reactivate'}
                    </button>
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
