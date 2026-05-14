import { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';

export default function IdleMode({ mockData, ambientMode }) {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 60000);
    return () => clearInterval(id);
  }, []);
  const nextEvent = mockData.events[0];

  return (
    <div className="idle-mode page-enter">
      <div className="idle-photo-surface">
        <div className="idle-gradient" />
        <div className="idle-content">
          <div>
            <p className="eyebrow">Family Hub • {ambientMode}</p>
            <h1>{time}</h1>
            <p className="context-line">18°C • Rain at 6PM • {nextEvent}</p>
          </div>

          <GlassCard className="idle-card">
            <p className="eyebrow">Photo Frame</p>
            <h2>Family moments</h2>
            <p className="muted">Shared folder slideshow will appear here when photo sync is connected.</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
