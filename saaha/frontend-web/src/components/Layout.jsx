import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const restaurant = JSON.parse(localStorage.getItem('saaha_restaurant') || '{}');

  const logout = () => {
    localStorage.removeItem('saaha_token');
    localStorage.removeItem('saaha_restaurant');
    navigate('/login');
  };

  const items = [
    { to: '/', label: '📊 Dashboard', end: true },
    { to: '/orders', label: '🧾 Orders' },
    { to: '/menu', label: '📋 Menu' },
    { to: '/subscription', label: '💳 Subscription' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">🍽️ SAAHA</div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 30, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '0 12px 8px' }}>
            {restaurant.restaurant_name || 'Restaurant'}
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
