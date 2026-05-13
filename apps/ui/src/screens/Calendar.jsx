import PageTitle from '../components/PageTitle';
import ListCard from '../components/ListCard';
import GlassCard from '../components/GlassCard';

export default function CalendarScreen({ mockData }) {
  return (
    <div className="screen page-enter">
      <PageTitle title="Calendar" subtitle="Apple and iCloud first family schedule." />
      <div className="two-column">
        <ListCard title="Next up" items={mockData.events} />
        <GlassCard>
          <h2>Calendar views</h2>
          <p className="muted">Month, week and day views will sit here after Apple Calendar sync is connected.</p>
        </GlassCard>
      </div>
    </div>
  );
}
