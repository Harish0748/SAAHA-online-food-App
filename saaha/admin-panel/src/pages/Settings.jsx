import { useEffect, useState } from 'react';
import api from '../api/client.js';

const LABELS = {
  commission_rate: { label: 'Restaurant commission rate', desc: 'Decimal, e.g. 0.10 = 10%', type: 'decimal' },
  delivery_fee: { label: 'Customer delivery fee (₹)', desc: 'Flat fee charged per order', type: 'number' },
  platform_fee: { label: 'Platform fee (₹)', desc: 'SAAHA promise: keep this at 0', type: 'number' },
  handling_fee: { label: 'Handling fee (₹)', desc: 'SAAHA promise: keep this at 0', type: 'number' },
  normal_subscription_price: { label: 'Normal restaurant plan (₹/month)', desc: '', type: 'number' },
  big_subscription_price: { label: 'Big restaurant plan (₹/month)', desc: '', type: 'number' },
  rider_payout_per_delivery: { label: 'Rider payout per delivery (₹)', desc: 'Paid out of the delivery fee', type: 'number' },
};

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const { data } = await api.get('/admin/settings');
    setSettings(data.settings);
    setEditValues(data.settings);
  };

  useEffect(() => { load(); }, []);

  const save = async (key) => {
    setSaving(key);
    setMessage('');
    try {
      await api.put(`/admin/settings/${key}`, { value: editValues[key] });
      setMessage(`✅ ${LABELS[key]?.label || key} updated successfully`);
      load();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Could not update setting'}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <h1 className="page-title">Commission & platform settings</h1>
      <p className="page-sub">Changes apply immediately to all new orders placed after saving</p>

      {message && <div className={message.startsWith('✅') ? 'success-msg' : 'error-msg'}>{message}</div>}

      <div className="card">
        {Object.keys(LABELS).map((key) => (
          <div className="settings-row" key={key}>
            <div>
              <div className="key">{LABELS[key].label}</div>
              {LABELS[key].desc && <div className="desc">{LABELS[key].desc}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={editValues[key] ?? ''}
                onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
                type="number"
                step={LABELS[key].type === 'decimal' ? '0.01' : '1'}
              />
              <button className="btn small" disabled={saving === key || editValues[key] === settings[key]} onClick={() => save(key)}>
                {saving === key ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>⚠️ Important</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          SAAHA's core promise to restaurants and customers is <strong>low commission, zero platform fee, zero handling fee</strong>.
          Changing <code>platform_fee</code> or <code>handling_fee</code> away from 0 — or raising <code>commission_rate</code> significantly above 10% —
          breaks that promise and should only be done with full awareness of the business positioning.
        </p>
      </div>
    </>
  );
}
