import GlassCard from './GlassCard';

export default function CameraCard({ camera }) {
  return (
    <GlassCard className="camera-card">
      <div className="camera-visual" />
      <h3>{camera[0]}</h3>
      <strong>{camera[1]}</strong>
      <p>{camera[2]}</p>
    </GlassCard>
  );
}
