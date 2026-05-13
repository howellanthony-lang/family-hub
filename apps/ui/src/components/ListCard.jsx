import GlassCard from './GlassCard';

export default function ListCard({ title, items }) {
  return (
    <GlassCard>
      <h2>{title}</h2>
      <ul className="clean-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </GlassCard>
  );
}
