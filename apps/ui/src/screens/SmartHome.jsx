import { useEffect, useState } from 'react';
import { api } from '../services/apiBase';

export default function SmartHomeScreen() {
  const [states, setStates] = useState([]);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    async function load() {
      try {
        const data = await api('/api/integrations/home-assistant/state');

        if (data.ok) {
          setStates(data.states || []);
          setStatus('Connected');
        } else {
          setStatus(data.error || 'Offline');
        }
      } catch (error) {
        setStatus(error.message || 'Offline');
      }
    }

    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const person = states.find((x) => x.entity_id === 'person.howell_anthony');
  const weather = states.find((x) => x.entity_id === 'weather.forecast_home');
  const den = states.find((x) => x.entity_id === 'media_player.den');
  const switches = states.filter((x) => x.entity_id?.startsWith('switch.')).slice(0, 8);

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">v1.9 Alpha</p>
          <h1>Smart Home</h1>
          <p className="muted">Live Home Assistant dashboard</p>
        </div>
        <span className="status-pill">{status}</span>
      </div>

      <div className="card-grid">
        <article className="glass-card">
          <p className="eyebrow">Who’s Home</p>
          <h2>{person?.name || 'Household'}</h2>
          <p className="muted">{person?.state || 'Unknown'}</p>
        </article>

        <article className="glass-card">
          <p className="eyebrow">Weather</p>
          <h2>{weather?.state || 'Unknown'}</h2>
          <p className="muted">{weather?.name || 'Forecast Home'}</p>
        </article>

        <article className="glass-card">
          <p className="eyebrow">Media</p>
          <h2>{den?.name || 'Den'}</h2>
          <p className="muted">{den?.state || 'Unknown'}</p>
        </article>
      </div>

      <div className="section-row">
        <h2>Switches</h2>
        <span>{switches.length} found</span>
      </div>

      <div className="device-grid">
        {switches.map((item) => (
          <article className="device-card" key={item.entity_id}>
            <h3>{item.name}</h3>
            <p>{item.state}</p>
            <small>{item.entity_id}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
