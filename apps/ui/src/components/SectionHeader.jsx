export default function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {action ? <span>{action}</span> : null}
    </div>
  );
}
