import GlassCard from './GlassCard';

export default function SetupCard({ title, text, button = 'Set up' }) {
  return (
    <GlassCard>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <button className="soft-button">{button}</button>
    </GlassCard>
  );
}
