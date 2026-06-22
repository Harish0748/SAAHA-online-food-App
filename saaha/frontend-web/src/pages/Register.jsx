import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function Register() {
  const [form, setForm] = useState({
    owner_name: '', owner_email: '', owner_phone: '', password: '',
    restaurant_name: '', address: '', city: '', pincode: '',
    fssai_number: '', gst_number: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/restaurant/register', form);
      setSuccess('Registered! Your account is pending verification (24-48 hrs). You can log in once approved.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <h1>🍽️ Join SAAHA</h1>
        <p className="sub">10% commission · No platform fee · No handling fee</p>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field"><label>Owner name</label><input value={form.owner_name} onChange={update('owner_name')} required /></div>
          <div className="field"><label>Owner email</label><input type="email" value={form.owner_email} onChange={update('owner_email')} required /></div>
          <div className="field"><label>Owner phone</label><input value={form.owner_phone} onChange={update('owner_phone')} required /></div>
          <div className="field"><label>Password</label><input type="password" value={form.password} onChange={update('password')} required /></div>
          <div className="field"><label>Restaurant name</label><input value={form.restaurant_name} onChange={update('restaurant_name')} required /></div>
          <div className="field"><label>Address</label><input value={form.address} onChange={update('address')} required /></div>
          <div className="field"><label>City</label><input value={form.city} onChange={update('city')} required /></div>
          <div className="field"><label>Pincode</label><input value={form.pincode} onChange={update('pincode')} required /></div>
          <div className="field"><label>FSSAI number</label><input value={form.fssai_number} onChange={update('fssai_number')} /></div>
          <div className="field"><label>GST number</label><input value={form.gst_number} onChange={update('gst_number')} /></div>
          <button className="btn" disabled={loading}>{loading ? 'Submitting…' : 'Register restaurant'}</button>
        </form>

        <div className="switch-link">
          Already registered? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
