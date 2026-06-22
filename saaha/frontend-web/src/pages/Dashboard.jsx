import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [statsRes, meRes] = await Promise.all([
        api.get('/auth/restaurant/dashboard'),
        api.get('/auth/restaurant/me'),
      ]);
      setStats(statsRes.data.stats);
      setProfile(meRes.data.restaurant);
    } catch (err) {
      setError('Could not load dashboard. Is the backend running?');
    }
  };

  useEffect(() => { load(); }, []);

  const toggleOpen = async () => {
    try {
      const { data } = await api.patch('/auth/restaurant/toggle');
      setProfile((p) => ({ ...p, is_open: data.is_open }));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not toggle status');
    }
  };

  if (error) return <div className="empty-state">{error}</div>;
  if (!stats || !profile) return <div className="empty-state">Loading…</div>;

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Welcome back, {profile.restaurant_name}</p>

      <div className="card">
        <div className="toggle-row">
          <div>
            <strong>{profile.is_open ? 'You are LIVE' : 'You are offline'}</strong>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {profile.subscription_status === 'active'
                ? 'Toggle to start/stop receiving orders'
                : 'Activate a subscription plan to go live'}
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={profile.is_open}
              disabled={profile.subscription_status !== 'active'}
              onChange={toggleOpen}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="label">Today's orders</div>
          <div className="value">{stats.today_orders}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today's revenue</div>
          <div className="value">₹{stats.today_revenue.toLocaleString('en-IN')}</div>
          <div className="sub">After 10% commission</div>
        </div>
        <div className="stat-card">
          <div className="label">This week</div>
          <div className="value">₹{stats.week_revenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total orders (all time)</div>
          <div className="value">{stats.total_orders}</div>
        </div>
      </div>

      <div className="card">
        <h3>Your fee structure</h3>
        <table>
          <tbody>
            <tr><td>Commission rate</td><td><strong>10%</strong></td></tr>
            <tr><td>Platform fee</td><td><strong>₹0</strong></td></tr>
            <tr><td>Handling fee</td><td><strong>₹0</strong></td></tr>
            <tr><td>Current plan</td><td><strong style={{ textTransform: 'capitalize' }}>{profile.subscription_type || 'None'}</strong></td></tr>
            <tr><td>Subscription status</td><td><span className={`badge ${profile.subscription_status === 'active' ? 'delivered' : 'cancelled'}`}>{profile.subscription_status}</span></td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
