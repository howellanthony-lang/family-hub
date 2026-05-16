import { useEffect, useState } from 'react';
import { API_BASE } from '../data/mockData';

const MODES = ['auto', 'day', 'night'];

export default function SettingsScreen({ displayModePreference, setDisplayModePreference }) {
  const [readiness, setReadiness] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/system/readiness`).then(r => r.json()).then(setReadiness).catch(() => {});
    fetch(`${API_BASE}/api/settings`).then(r => r.json()).then(setSettings).catch(() => {});
  }, []);

  async function saveSetting(key, value) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await fetch(`${API_BASE}/api/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) });
  }

  return (
    <div className="screen page-enter settings">
      <div className="section-header" style={{ marginBottom: 20 }}><h2>Settings</h2></div>

      <div className="settings-section">
        <h3>Display mode</h3>
        <div className="mode-toggle">
          {MODES.map(m => (
            <button key={m} className={displayModePreference === m ? 'active' : ''} onClick={() => setDisplayModePreference(m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {settings && (
        <div className="settings-section">
          <h3>Location</h3>
          <label>
            Weather location
            <input
              defaultValue={settings.weatherLocation || ''}
              onBlur={e => saveSetting('weatherLocation', e.target.value)}
              placeholder="e.g. Wakefield, UK"
            />
          </label>
        </div>
      )}

      {readiness && (
        <div className="settings-section">
          <div className="readiness-head">
            <h3>System readiness</h3>
            <span className="muted">Score: {readiness.score}%</span>
          </div>
          <div className="release-checks">
            {readiness.checks?.map(c => (
              <div key={c.id} className={`release-row${c.ok ? '' : ' warn'}`}>
                <span>{c.ok ? '✓' : '!'}</span>
                <div>
                  <b>{c.label}</b>
                  <small>{c.detail}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="settings-section">
        <h3>About</h3>
        <p className="muted">Family Hub v2.1.0 · Raspberry Pi wall dashboard</p>
        <p className="muted">API: <a href={`${API_BASE}/api/health`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{API_BASE}/api/health</a></p>
      </div>
    </div>
  );
}
