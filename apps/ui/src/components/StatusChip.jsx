import GlassCard from './GlassCard';

export default function StatusChip({ label, value, detail }) {
  return (
    <GlassCard className="status-chip">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </GlassCard>
  );
}
