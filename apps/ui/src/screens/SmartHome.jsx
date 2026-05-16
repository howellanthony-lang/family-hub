import { useEffect, useState } from 'react';
import { API_BASE } from '../data/mockData';

export default function SmartHomeScreen() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    fetch(`${API_BASE}/api/homekit/summary`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => setSummary({ status: 'error', message: 'Could not reach the API.' }))
      .finally(() => setLoading(false));
  }

  async function toggle(entity_id) {
    setToggling(entity_id);
    try {
      await fetch(`${API_BASE}/api/homekit/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity_id }) });
      setTimeout(load, 800);
    } catch {}
    finally { setTimeout(() => setToggling(null), 900); }
  }

  if (loading) return <div className="screen page-enter"><p className="muted">Loading smart home…</p></div>;

  if (!summary?.configured) {
    return (
      <div className="screen page-enter">
        <h2>Smart Home</h2>
        <div className="glass-card setup-notice">
          <p className="eyebrow">Not connected</p>
          <p>Smart Home not connected yet.</p>
          <p className="muted">Add these to <code>/home/mando3/family-hub/.env</code> then restart the API:</p>
          <pre style={{ background: 'var(--panel-soft)', padding: '12px 16px', borderRadius: 12, lineHeight: 1.8 }}>
{`HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=your_long_lived_token
SMART_HOME_ENABLED=true`}
          </pre>
          <p className="muted">To get a token: open Home Assistant → Profile (bottom-left) → Long-Lived Access Tokens → Create Token.</p>
          <p className="muted">{summary?.message || ''}</p>
        </div>
      </div>
    );
  }

  const byDomain = summary.entities.reduce((acc, e) => {
    acc[e.domain] = acc[e.domain] || [];
    acc[e.domain].push(e);
    return acc;
  }, {});

  const domainOrder = ['light', 'switch', 'media_player', 'climate', 'cover', 'lock', 'sensor', 'binary_sensor'];
  const domainLabel = { light: 'Lights', switch: 'Switches', media_player: 'Media', climate: 'Climate', cover: 'Covers', lock: 'Locks', sensor: 'Sensors', binary_sensor: 'Sensors' };
  const toggleable = ['light', 'switch', 'media_player', 'cover'];

  return (
    <div className="screen page-enter">
      <div className="section-header">
        <h2>Smart Home</h2>
        <button onClick={load}>Refresh</button>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>{summary.count} entities · {summary.url}</p>

      {domainOrder.filter(d => byDomain[d]?.length).map(domain => (
        <div key={domain} style={{ marginBottom: 20 }}>
          <div className="section-header"><h3>{domainLabel[domain] || domain}</h3></div>
          <div className="room-grid">
            {byDomain[domain].map(e => (
              <div key={e.entity_id} className="device-tile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <b>{e.name}</b>
                  <span style={{ display: 'block', marginTop: 4 }}>{e.state}</span>
                </div>
                {toggleable.includes(domain) && (
                  <button
                    onClick={() => toggle(e.entity_id)}
                    disabled={toggling === e.entity_id}
                    style={{
                      minWidth: 64, minHeight: 36, borderRadius: 999,
                      background: e.state === 'on' || e.state === 'playing' ? 'var(--accent)' : 'var(--panel-soft)',
                      color: e.state === 'on' || e.state === 'playing' ? '#00111f' : 'var(--text)',
                      border: '1px solid var(--line)', fontWeight: 900
                    }}
                  >
                    {toggling === e.entity_id ? '…' : e.state === 'on' || e.state === 'playing' ? 'On' : 'Off'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
