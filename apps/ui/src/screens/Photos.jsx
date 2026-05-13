import PageTitle from '../components/PageTitle';
import GlassCard from '../components/GlassCard';

export default function PhotosScreen() {
  return (
    <div className="screen page-enter">
      <PageTitle title="Photos" subtitle="Idle mode becomes a calm family photo frame." />
      <GlassCard className="photo-preview">
        <div>
          <p className="eyebrow">Photo Frame</p>
          <h2>Clock • Weather • Next event</h2>
          <p>Shared folder slideshow placeholder.</p>
        </div>
      </GlassCard>
    </div>
  );
}
