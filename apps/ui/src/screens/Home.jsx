import GlassCard from '../components/GlassCard';
import StatusChip from '../components/StatusChip';
import CameraCard from '../components/CameraCard';
import SceneCard from '../components/SceneCard';
import RoomCard from '../components/RoomCard';
import SectionHeader from '../components/SectionHeader';
import { getGreeting } from '../utils/ambientMode';

export default function HomeScreen({ mockData, today, ambientMode }) {
  return (
    <div className="screen home-screen page-enter">
      <header className="hero-row">
        <div>
          <p className="eyebrow">Family Hub • {ambientMode} Mode</p>
          <h1>{getGreeting()}</h1>
          <p className="context-line">{today} • 18°C • 2 events today • Dinner planned</p>
        </div>
        <GlassCard className="time-card">
          <span>Now</span>
          <strong>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong>
        </GlassCard>
      </header>

      <section className="status-grid">
        {mockData.status.map(([label, value, detail]) => (
          <StatusChip key={label} label={label} value={value} detail={detail} />
        ))}
      </section>

      <div className="content-grid">
        <section className="main-column">
          <SectionHeader title="Cameras" action="View all" />
          <div className="camera-grid">
            {mockData.cameras.map((camera) => <CameraCard key={camera[0]} camera={camera} />)}
          </div>

          <SectionHeader title="Scenes" action="Edit" />
          <div className="scene-row">
            {mockData.scenes.map((scene) => <SceneCard key={scene} title={scene} />)}
          </div>

          <SectionHeader title="Rooms" action="All rooms" />
          <div className="room-grid">
            {mockData.rooms.map((room) => <RoomCard key={room[0]} room={room} />)}
          </div>
        </section>

        <aside className="side-column">
          <GlassCard className="today-card">
            <p className="eyebrow">Today</p>
            <h2>Household summary</h2>
            <ul className="clean-list">
              <li>Baby scan at 14:30</li>
              <li>Rain expected around 18:00</li>
              <li>Chicken tacos planned for dinner</li>
              <li>3 chores still need doing</li>
            </ul>
          </GlassCard>
          <GlassCard>
            <p className="eyebrow">Quiet nudge</p>
            <h2>Good Night is ready</h2>
            <p className="muted">Lights, nursery status and tomorrow preview can be grouped into one evening routine.</p>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}
