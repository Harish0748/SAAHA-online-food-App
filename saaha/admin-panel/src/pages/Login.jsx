import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/admin/login', { email, password });
      localStorage.setItem('saaha_admin_token', data.token);
      localStorage.setItem('saaha_admin', JSON.stringify(data.admin));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>🛡️ SAAHA Admin</h1>
        <p className="sub">Platform management console</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button className="btn full" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
        </form>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 18, textAlign: 'center' }}>
          Default seed admin: admin@saaha.in / Admin@123 — change immediately after first login.
        </p>
      </div>
    </div>
  );
}
