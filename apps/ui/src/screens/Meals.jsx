import { useEffect, useState } from 'react';
import { API_BASE } from '../data/mockData';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const MEALS = ['breakfast','lunch','dinner'];

export default function MealsScreen() {
  const [meals, setMeals] = useState({});
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/meals/week`).then(r => r.json()).then(setMeals).catch(() => {});
  }, []);

  async function save(day, meal) {
    const updated = { ...meals, [day]: { ...(meals[day] || {}), [meal]: draft } };
    setMeals(updated);
    setEditing(null);
    await fetch(`${API_BASE}/api/meals/week`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [day]: updated[day] }) });
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();

  return (
    <div className="screen page-enter">
      <div className="section-header"><h2>Meals this week</h2></div>
      <div style={{ display: 'grid', gap: 14 }}>
        {DAYS.map(day => (
          <div key={day} className="glass-card" style={{ borderLeft: day === today ? '3px solid var(--accent)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{day}{day === today ? ' — Today' : ''}</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {MEALS.map(meal => {
                const key = `${day}-${meal}`;
                const value = meals[day]?.[meal] || '';
                return editing === key
                  ? <div key={meal} style={{ display: 'grid', gap: 6 }}>
                      <label style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{meal}</label>
                      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(day, meal); if (e.key === 'Escape') setEditing(null); }} />
                      <button onClick={() => save(day, meal)}>Save</button>
                    </div>
                  : <div key={meal} onClick={() => { setEditing(key); setDraft(value); }} style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 14, background: 'var(--panel-soft)', border: '1px solid var(--line)' }}>
                      <small style={{ color: 'var(--muted)', textTransform: 'capitalize', display: 'block', marginBottom: 4 }}>{meal}</small>
                      <span>{value || <em style={{ color: 'var(--muted)' }}>tap to add</em>}</span>
                    </div>;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
