import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('saaha_admin') || '{}');

  const logout = () => {
    localStorage.removeItem('saaha_admin_token');
    localStorage.removeItem('saaha_admin');
    navigate('/login');
  };

  const items = [
    { to: '/', label: '📊 Dashboard', end: true },
    { to: '/restaurants', label: '🍽️ Restaurants' },
    { to: '/riders', label: '🏍️ Delivery Partners' },
    { to: '/users', label: '👥 Customers' },
    { to: '/orders', label: '🧾 Orders' },
    { to: '/payouts', label: '💰 Payout Reports' },
    { to: '/settings', label: '⚙️ Commission Settings' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">🛡️ SAAHA Admin</div>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {item.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 30, paddingTop: 16, borderTop: '1px solid #1E293B' }}>
          <p style={{ fontSize: 12, color: '#94A3B8', padding: '0 12px 8px' }}>
            {admin.name || 'Admin'} · {admin.role}
          </p>
          <div className="nav-item" onClick={logout}>🚪 Logout</div>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
