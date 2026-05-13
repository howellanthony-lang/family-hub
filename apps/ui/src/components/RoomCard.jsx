import GlassCard from './GlassCard';

export default function RoomCard({ room }) {
  return (
    <GlassCard className="room-card">
      <h3>{room[0]}</h3>
      <strong>{room[1]}</strong>
      <p>{room[2]}</p>
    </GlassCard>
  );
}
