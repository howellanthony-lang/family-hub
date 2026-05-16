import { useEffect, useState } from 'react';
import { API_BASE } from '../data/mockData';

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => { load(); }, []);

  function load() {
    fetch(`${API_BASE}/api/tasks`).then(r => r.json()).then(data => setTasks(Array.isArray(data) ? data : [])).catch(() => {});
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    await fetch(`${API_BASE}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle.trim(), done: false }) });
    setNewTitle('');
    load();
  }

  async function toggle(task) {
    await fetch(`${API_BASE}/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !task.done }) });
    load();
  }

  async function remove(id) {
    await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' });
    load();
  }

  const open = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  return (
    <div className="screen page-enter">
      <div className="section-header"><h2>Tasks</h2></div>

      <div className="add-row" style={{ marginBottom: 20 }}>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          style={{ flex: 1 }}
        />
        <button onClick={addTask}>Add</button>
      </div>

      {open.length === 0 && done.length === 0 && <p className="muted">No tasks yet. Add one above.</p>}

      {open.length > 0 && (
        <div className="glass-card" style={{ marginBottom: 16 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {open.map(t => (
              <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                <button onClick={() => toggle(t)} style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--accent)', background: 'transparent', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.title}</span>
                <button onClick={() => remove(t.id)} style={{ color: 'var(--danger)', background: 'transparent', border: 0, fontSize: '1.2rem', padding: '0 4px' }}>×</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {done.length > 0 && (
        <details>
          <summary className="muted" style={{ cursor: 'pointer', marginBottom: 10 }}>Done ({done.length})</summary>
          <div className="glass-card">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              {done.map(t => (
                <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', opacity: 0.55 }}>
                  <button onClick={() => toggle(t)} style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid var(--good)', background: 'var(--good)', flexShrink: 0 }} />
                  <span style={{ flex: 1, textDecoration: 'line-through' }}>{t.title}</span>
                  <button onClick={() => remove(t.id)} style={{ color: 'var(--danger)', background: 'transparent', border: 0, fontSize: '1.2rem', padding: '0 4px' }}>×</button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
