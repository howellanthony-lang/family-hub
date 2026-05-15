export default function SmartHomeScreen() {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Home Assistant</p>
          <h1>Smart Home</h1>
        </div>
        <span className="status-pill">Connected</span>
      </div>

      <div className="glass-card">
        <h2>Smart Home Connected</h2>
        <p className="muted">
          Home Assistant is connected. Device cards will be added in the next build step.
        </p>
      </div>
    </section>
  );
}
