import GlassCard from '../components/GlassCard';

const steps = [
  'Welcome',
  'Household Name',
  'Admin PIN',
  'Apple Calendar',
  'Pair Phone',
  'Modules',
  'Finish',
];

export default function Onboarding({ onComplete, ambientMode }) {
  return (
    <div className="screen onboarding-screen page-enter">
      <GlassCard className="onboarding-card">
        <p className="eyebrow">Family Hub • {ambientMode} Mode</p>
        <h1>Welcome home</h1>
        <p className="context-line">
          Set up your household, connect Apple Calendar and create a calm shared family dashboard.
        </p>

        <div className="onboarding-steps">
          {steps.map((step, index) => (
            <div key={step} className="step-row">
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>

        <button className="soft-button" onClick={onComplete}>
          Enter Family Hub
        </button>
      </GlassCard>
    </div>
  );
}
