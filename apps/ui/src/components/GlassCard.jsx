export default function GlassCard({ children, className = '' }) {
  return <article className={`glass-card ${className}`}>{children}</article>;
}
