import PageTitle from '../components/PageTitle';
import ListCard from '../components/ListCard';
import GlassCard from '../components/GlassCard';

export default function AutomationScreen({ mockData }) {
  return (
    <div className="screen page-enter">
      <PageTitle title="Automation" subtitle="Scenes and household routines." />
      <div className="two-column">
        <ListCard title="Routines" items={mockData.scenes} />
        <GlassCard>
          <h2>Ambient routines</h2>
          <p className="muted">Good Night, Morning Routine, Leave Home and Baby Mode stay one tap away.</p>
        </GlassCard>
      </div>
    </div>
  );
}
