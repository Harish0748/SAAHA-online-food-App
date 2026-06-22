import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Menu() {
  const [menu, setMenu] = useState([]);
  const [catName, setCatName] = useState('');
  const [showItemForm, setShowItemForm] = useState(null); // category_id
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', is_veg: true });

  const load = async () => {
    const { data } = await api.get('/menu/my');
    setMenu(data.menu.filter(c => c.category_id)); // filter out null category rows
  };

  useEffect(() => { load(); }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await api.post('/menu/category', { name: catName });
    setCatName('');
    load();
  };

  const addItem = async (categoryId) => {
    if (!itemForm.name || !itemForm.price) return;
    await api.post('/menu/item', { ...itemForm, category_id: categoryId, price: parseFloat(itemForm.price) });
    setItemForm({ name: '', description: '', price: '', is_veg: true });
    setShowItemForm(null);
    load();
  };

  const toggleItem = async (id) => {
    await api.patch(`/menu/item/${id}/toggle`);
    load();
  };

  const deleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/menu/item/${id}`);
    load();
  };

  return (
    <>
      <h1 className="page-title">Menu</h1>
      <p className="page-sub">Manage your categories and items</p>

      <div className="card">
        <h3>Add a category</h3>
        <form onSubmit={addCategory} style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="e.g. Starters, Main Course"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
          />
          <button className="btn" style={{ width: 'auto', padding: '10px 20px' }}>Add</button>
        </form>
      </div>

      {menu.length === 0 && (
        <div className="card"><div className="empty-state">No categories yet. Add one above to get started.</div></div>
      )}

      {menu.map((cat) => (
        <div className="card" key={cat.category_id}>
          <h3>{cat.category_name}</h3>
          {(cat.items || []).filter(Boolean).map((item) => (
            <div className="menu-item-row" key={item.id}>
              <div>
                <div className="item-name">{item.is_veg ? '🟢' : '🔴'} {item.name}</div>
                <div className="item-price">₹{item.price} {item.discounted_price && `→ ₹${item.discounted_price}`}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="switch">
                  <input type="checkbox" checked={item.is_available} onChange={() => toggleItem(item.id)} />
                  <span className="slider"></span>
                </label>
                <button className="btn secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                  onClick={() => deleteItem(item.id)}>Delete</button>
              </div>
            </div>
          ))}

          {showItemForm === cat.category_id ? (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div className="field"><input placeholder="Item name" value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
              <div className="field"><input placeholder="Description" value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} /></div>
              <div className="field"><input type="number" placeholder="Price (₹)" value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => addItem(cat.category_id)}>Save item</button>
                <button className="btn secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setShowItemForm(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12, marginTop: 10 }}
              onClick={() => setShowItemForm(cat.category_id)}>+ Add item</button>
          )}
        </div>
      ))}
    </>
  );
}
