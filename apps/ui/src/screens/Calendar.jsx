import { useEffect, useState } from 'react';
import { API_BASE } from '../data/mockData';

export default function CalendarScreen() {
  const [config, setConfig] = useState(null);
  const [events, setEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/calendar/config`).then(r => r.json()).then(setConfig).catch(() => {});
    loadEvents();
  }, []);

  function loadEvents() {
    fetch(`${API_BASE}/api/calendar/events`).then(r => r.json()).then(d => setEvents(d.events || [])).catch(() => {});
  }

  async function doSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const r = await fetch(`${API_BASE}/api/calendar/sync`, { method: 'POST' });
      const d = await r.json();
      const apple = d.results?.apple;
      const webcal = d.results?.webcal;
      const parts = [];
      if (apple?.ok) parts.push(`Apple: ${apple.imported} events`);
      else if (apple?.error) parts.push(`Apple: ${apple.error}`);
      if (webcal?.ok) parts.push(`Webcal: ${webcal.imported} events`);
      setSyncMsg(parts.join(' • ') || 'Done');
      loadEvents();
    } catch (e) {
      setSyncMsg('Sync failed — check API is running');
    } finally {
      setSyncing(false);
    }
  }

  const upcoming = events
    .filter(e => e.start && new Date(e.start) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 30);

  const appleReady = config?.apple?.configured && config?.apple?.calendarUrl;

  return (
    <div className="screen page-enter">
      <div className="section-header">
        <h2>Calendar</h2>
        <button onClick={doSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</button>
      </div>
      {syncMsg && <p className="muted" style={{ marginBottom: 12 }}>{syncMsg}</p>}

      {config && !appleReady && (
        <div className="glass-card setup-notice" style={{ marginBottom: 20 }}>
          <p className="eyebrow">Apple Calendar not connected</p>
          <p>{config.apple?.note}</p>
          <ol style={{ color: 'var(--muted)', paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Go to <strong>appleid.apple.com</strong></li>
            <li>Sign-In and Security → App-Specific Passwords → <strong>Create Token</strong></li>
            <li>Add to <code>/home/mando3/family-hub/.env</code>:
              <pre style={{ background: 'var(--panel-soft)', padding: '10px 14px', borderRadius: 12, marginTop: 8 }}>{`APPLE_USERNAME=your@icloud.com\nAPPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx`}</pre>
            </li>
            <li>Run <code>POST /api/calendar/discover</code> to find your calendar URL</li>
            <li>Add <code>APPLE_CALENDAR_URL=</code> to .env, then restart the API</li>
          </ol>
        </div>
      )}

      {upcoming.length === 0
        ? <div className="glass-card"><p className="muted">No upcoming events. Press Sync now to pull from your calendar.</p></div>
        : <div className="glass-card">
            <div className="timeline">
              {upcoming.map(e => (
                <div className="timeline-row" key={e.id}>
                  <span>
                    {new Date(e.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    <br />
                    <small>{new Date(e.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</small>
                  </span>
                  <div>
                    <b>{e.title}</b>
                    {e.location && <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>{e.location}</p>}
                  </div>
                  <em style={{ fontSize: '0.78rem' }}>{e.source || ''}</em>
                </div>
              ))}
            </div>
          </div>
      }
    </div>
  );
}
