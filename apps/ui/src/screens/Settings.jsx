import PageTitle from '../components/PageTitle';
import SetupCard from '../components/SetupCard';

export default function SettingsScreen() {
  return (
    <div className="screen page-enter">
      <PageTitle
        title="Settings"
        subtitle="Local-first setup and trusted household access."
      />

      <div className="quad-grid">
        <SetupCard
          title="Connect Apple Calendar"
          text="Use your iCloud email and an Apple app-specific password. This is not your normal Apple ID password."
        />

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
