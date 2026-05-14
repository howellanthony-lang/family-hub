import PageTitle from '../components/PageTitle';
import SetupCard from '../components/SetupCard';
import GlassCard from '../components/GlassCard';
import AppleCalendarSetup from '../components/AppleCalendarSetup';

const displayModes = [
  ['auto', 'Auto'],
  ['day', 'Day'],
  ['night', 'Night'],
];

export default function SettingsScreen({ displayModePreference, setDisplayModePreference }) {
  return (
    <div className="screen page-enter">
      <PageTitle
        title="Settings"
        subtitle="Local-first setup and trusted household access."
      />

      <GlassCard>
        <p className="eyebrow">Display</p>
        <h2>Display Mode</h2>
        <p className="muted">
          Choose Auto for time-based ambience, Day for a brighter kitchen display, or Night for a calmer low-light screen.
        </p>
        <div className="mode-toggle">
          {displayModes.map(([value, label]) => (
            <button
              key={value}
              className={displayModePreference === value ? 'active' : ''}
              onClick={() => setDisplayModePreference(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </GlassCard>

      <AppleCalendarSetup />

      <div className="quad-grid">
        <SetupCard
          title="Admin PIN"
          text="Protect settings, integrations, backups and paired devices."
        />

        <SetupCard
          title="Pair a phone"
          text="Scan a QR code and approve with the admin PIN."
        />

        <SetupCard
          title="Privacy"
          text="Local-first by default. Remote access and integrations stay optional."
          button="Learn more"
        />
      </div>
    </div>
  );
}
