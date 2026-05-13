import { useMemo, useState } from 'react';
import './styles.css';

const tabs = ['Home', 'Calendar', 'Automation', 'Family', 'Photos', 'Settings'];

const mock = {
  status: [
    ['Climate', '21°C', 'Comfortable'],
    ['Lights', '7 on', 'Evening ready'],
    ['Security', 'Secure', 'All doors closed'],
    ['Media', 'Quiet', 'No speaker active'],
    ['Weather', '18°C', 'Rain at 6PM'],
    ['Calendar', '2 events', 'Next at 14:30'],
  ],
  cameras: [
    ['Nursery', 'Calm', '22°C • last motion 12 min ago'],
    ['Front Door', 'Clear', 'No motion detected'],
    ['Garden', 'Quiet', 'Last checked 10:04'],
  ],
  scenes: ['Morning Routine', 'Good Night', 'Leave Home', 'Dinner Time', 'Baby Mode'],
  rooms: [
    ['Living Room', '4 lights on', '20°C • TV quiet'],
    ['Kitchen', 'Dinner reminder', 'Chicken tacos planned'],
    ['Bedroom', 'Calm', 'Good Night ready'],
    ['Nursery', 'Camera active', 'White noise ready'],
  ],
  events: ['14:30 Baby scan appointment', '18:00 Rain expected', '19:30 Dinner planned'],
  chores: ['Put washing away', 'Bins out tonight', 'Kitchen reset'],
  meals: ['Breakfast: oats and berries', 'Dinner: chicken tacos', 'Tomorrow: slow cooker chilli'],
  notes: ['Remember to charge the buggy fan', 'Check calendar colours after Apple sync'],
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const today = useMemo(() => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), []);

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="app-frame">
        {activeTab === 'Home' && <HomeScreen today={today} />}
        {activeTab === 'Calendar' && <ListScreen title="Calendar" subtitle="Apple/iCloud-first family schedule" items={mock.events} aside="Month, week and day views will sit here." />}
        {activeTab === 'Automation' && <ListScreen title="Automation" subtitle="Scenes and household routines" items={mock.scenes} aside="Good Night, Morning Routine, Leave Home and Baby Mode stay one tap away." />}
        {activeTab === 'Family' && <FamilyScreen />}
        {activeTab === 'Photos' && <PhotosScreen />}
        {activeTab === 'Settings' && <SettingsScreen />}
      </section>
      <BottomDock activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}

function HomeScreen({ today }) {
  return (
    <div className="screen home-screen">
      <header className="hero-row">
        <div>
          <p className="eyebrow">Family Hub</p>
          <h1>{getGreeting()}</h1>
          <p className="context-line">{today} • 18°C • 2 events today • Dinner planned</p>
        </div>
        <GlassCard className="time-card">
          <span>Now</span>
          <strong>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong>
        </GlassCard>
      </header>

      <section className="status-grid">
        {mock.status.map(([label, value, detail]) => <StatusChip key={label} label={label} value={value} detail={detail} />)}
      </section>

      <div className="content-grid">
        <section className="main-column">
          <SectionHeader title="Cameras" action="View all" />
          <div className="camera-grid">
            {mock.cameras.map((camera) => <CameraCard key={camera[0]} camera={camera} />)}
          </div>

          <SectionHeader title="Scenes" action="Edit" />
          <div className="scene-row">
            {mock.scenes.map((scene) => <SceneCard key={scene} title={scene} />)}
          </div>

          <SectionHeader title="Rooms" action="All rooms" />
          <div className="room-grid">
            {mock.rooms.map((room) => <RoomCard key={room[0]} room={room} />)}
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

function FamilyScreen() {
  return <div className="screen"><PageTitle title="Family" subtitle="Chores, meals, grocery and notes in one calm place." /><div className="quad-grid"><ListCard title="Chores" items={mock.chores} /><ListCard title="Meals" items={mock.meals} /><ListCard title="Grocery" items={['Milk', 'Nappies', 'Chicken mince']} /><ListCard title="Notes" items={mock.notes} /></div></div>;
}

function PhotosScreen() {
  return <div className="screen"><PageTitle title="Photos" subtitle="Idle mode becomes a calm family photo frame." /><GlassCard className="photo-preview"><div><p className="eyebrow">Photo Frame</p><h2>Clock • Weather • Next event</h2><p>Shared folder slideshow placeholder.</p></div></GlassCard></div>;
}

function SettingsScreen() {
  return <div className="screen"><PageTitle title="Settings" subtitle="Local-first setup and trusted household access." /><div className="quad-grid"><SetupCard title="Connect Apple Calendar" text="Use your iCloud email and an Apple app-specific password. This is not your normal Apple ID password." /><SetupCard title="Admin PIN" text="Protect settings, integrations, backups and paired devices." /><SetupCard title="Pair a phone" text="Scan a QR code and approve with the admin PIN." /><SetupCard title="Privacy" text="Local-first by default. Remote access and integrations stay optional." /></div></div>;
}

function ListScreen({ title, subtitle, items, aside }) {
  return <div className="screen"><PageTitle title={title} subtitle={subtitle} /><div className="two-column"><ListCard title="Next up" items={items} /><GlassCard><h2>Coming next</h2><p className="muted">{aside}</p></GlassCard></div></div>;
}

function PageTitle({ title, subtitle }) { return <header className="page-title"><p className="eyebrow">Family Hub</p><h1>{title}</h1><p className="context-line">{subtitle}</p></header>; }
function SectionHeader({ title, action }) { return <div className="section-header"><h2>{title}</h2><span>{action}</span></div>; }
function GlassCard({ children, className = '' }) { return <article className={`glass-card ${className}`}>{children}</article>; }
function StatusChip({ label, value, detail }) { return <GlassCard className="status-chip"><span>{label}</span><strong>{value}</strong><small>{detail}</small></GlassCard>; }
function CameraCard({ camera }) { return <GlassCard className="camera-card"><div className="camera-visual" /><h3>{camera[0]}</h3><strong>{camera[1]}</strong><p>{camera[2]}</p></GlassCard>; }
function SceneCard({ title }) { return <button className="scene-card">{title}</button>; }
function RoomCard({ room }) { return <GlassCard className="room-card"><h3>{room[0]}</h3><strong>{room[1]}</strong><p>{room[2]}</p></GlassCard>; }
function ListCard({ title, items }) { return <GlassCard><h2>{title}</h2><ul className="clean-list">{items.map((item) => <li key={item}>{item}</li>)}</ul></GlassCard>; }
function SetupCard({ title, text }) { return <GlassCard><h2>{title}</h2><p className="muted">{text}</p><button className="soft-button">Set up</button></GlassCard>; }

function BottomDock({ activeTab, setActiveTab }) {
  return <nav className="bottom-dock">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>;
}
