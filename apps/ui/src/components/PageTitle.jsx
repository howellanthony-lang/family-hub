export default function PageTitle({ title, subtitle }) {
  return (
    <header className="page-title">
      <p className="eyebrow">Family Hub</p>
      <h1>{title}</h1>
      <p className="context-line">{subtitle}</p>
    </header>
  );
}
