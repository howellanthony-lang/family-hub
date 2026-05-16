import { useEffect, useState } from 'react';
import { API_BASE } from '../data/mockData';
import { getGreeting } from '../utils/ambientMode';

function useClock() {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const [time, setTime] = useState(fmt);
  useEffect(() => { const id = setInterval(() => setTime(fmt()), 30000); return () => clearInterval(id); }, []);
  return time;
}

export default function HomeScreen({ today, ambientMode }) {
  const time = useClock();
  const [weather, setWeather] = useState(null);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/weather`).then(r => r.json()).then(setWeather).catch(() => {});
    fetch(`${API_BASE}/api/events`).then(r => r.json()).then(data => {
      const todayStr = new Date().toISOString().slice(0, 10);
      setEvents((Array.isArray(data) ? data : []).filter(e => (e.start || '').startsWith(todayStr)).slice(0, 5));
    }).catch(() => {});
    fetch(`${API_BASE}/api/tasks`).then(r => r.json()).then(data =>
      setTasks((Array.isArray(data) ? data : []).filter(t => !t.done).slice(0, 5))
    ).catch(() => {});
  }, []);

  return (
    <div className="screen page-enter">
      <div className="hero-row">
        <div>
          <p className="eyebrow">Family Hub • {ambientMode}</p>
          <h1>{getGreeting()}</h1>
          <p className="context-line">{today}{weather?.current ? ` • ${weather.current.temperature}°C ${weather.current.condition}` : ''}</p>
        </div>
        <div className="glass-card time-card">
          <span>Now</span>
          <strong>{time}</strong>
        </div>
      </div>

      <div className="content-grid">
        <div className="main-column">
          {weather?.daily && (
            <div className="glass-card">
              <div className="section-header"><h2>Forecast</h2></div>
              <div className="forecast-strip">
                {weather.daily.slice(0, 5).map(d => (
                  <div key={d.date}>
                    <small>{new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' })}</small>
                    <span>{d.condition}</span>
                    <b>{d.max}°</b>
                    <span>{d.min}°</span>
                    <small>{d.rain}% rain</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card">
            <div className="section-header"><h2>Today's events</h2></div>
            {events.length === 0
              ? <p className="muted">No events today. Sync your calendar in the Calendar tab.</p>
              : <div className="timeline">
                  {events.map(e => (
                    <div className="timeline-row" key={e.id}>
                      <span>{e.start ? new Date(e.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'All day'}</span>
                      <b>{e.title}</b>
                      <em>{e.location || ''}</em>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        <div className="side-column">
          <div className="glass-card">
            <div className="section-header"><h2>Tasks</h2></div>
            {tasks.length === 0
              ? <p className="muted">All clear.</p>
              : <ul className="clean-list">{tasks.map(t => <li key={t.id}>{t.title}</li>)}</ul>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
