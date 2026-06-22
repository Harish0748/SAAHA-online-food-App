import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Subscription() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get('/subscriptions/status');
    setStatus(data.subscription);
  };

  useEffect(() => { load(); }, []);

  const subscribe = async (plan_type) => {
    setLoading(true);
    try {
      // In production: open Razorpay checkout here, then call /activate with real payment_id
      const fakePaymentId = `demo_pay_${Date.now()}`;
      const { data } = await api.post('/subscriptions/activate', { plan_type, payment_id: fakePaymentId });
      alert(data.message);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  if (!status) return <div className="empty-state">Loading…</div>;

  return (
    <>
      <h1 className="page-title">Subscription</h1>
      <p className="page-sub">
        Current plan: <strong style={{ textTransform: 'capitalize' }}>{status.subscription_type || 'None'}</strong>
        {status.subscription_status === 'active' && ` · ${status.days_left} days left`}
      </p>

      <div className="plan-grid">
        <div className={`plan-box ${status.subscription_type === 'normal' && status.subscription_status === 'active' ? 'active' : ''}`}>
          <strong>⭐ Normal</strong>
          <div className="plan-price">₹4,999 <span>/ month</span></div>
          <ul className="feat-list">
            <li>✅ Unlimited orders</li>
            <li>✅ Only 10% commission</li>
            <li>✅ Dashboard access</li>
            <li>✅ Basic analytics</li>
            <li>✅ Customer ratings</li>
          </ul>
          <button className="btn" disabled={loading} onClick={() => subscribe('normal')}>
            {status.subscription_type === 'normal' && status.subscription_status === 'active' ? 'Renew' : 'Subscribe'}
          </button>
        </div>

        <div className={`plan-box ${status.subscription_type === 'big' && status.subscription_status === 'active' ? 'active' : ''}`}>
          <strong>👑 Big restaurant</strong>
          <div className="plan-price">₹6,999 <span>/ month</span></div>
          <ul className="feat-list">
            <li>✅ Everything in Normal</li>
            <li>✅ Priority listing</li>
            <li>✅ Advanced analytics</li>
            <li>✅ Promo banner slots</li>
            <li>✅ Dedicated support</li>
          </ul>
          <button className="btn" disabled={loading} onClick={() => subscribe('big')}>
            {status.subscription_type === 'big' && status.subscription_status === 'active' ? 'Renew' : 'Subscribe'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          ⚠️ This demo activates instantly for testing. In production, wire the <code>subscribe()</code> function
          to open Razorpay Checkout first, then call <code>/subscriptions/activate</code> with the real payment ID
          returned after a successful payment.
        </p>
      </div>
    </>
  );
}
