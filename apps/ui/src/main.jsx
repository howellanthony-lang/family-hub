import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, CheckSquare, CloudSun, Home, ListTodo, Moon, NotebookText, ShoppingCart, Sun, Utensils, Image, Settings, RefreshCcw, Lightbulb, RadioTower, ShieldCheck, Monitor, Users, Bell, Lock, Eye } from 'lucide-react';
import { api } from './services/apiBase';
import './styles.css';

const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const defaultScreenSaver = { enabled: true, minutes: 3, showClock: true, showWeather: true, showNextEvent: true, showTasks: true, photoMode: true, nightDim: true };

function Clock({ large = false }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return <div className={large ? 'clock large-clock' : 'clock'}><strong>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><span>{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>;
}

function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('home');
  const [theme, setTheme] = useState(localStorage.getItem('familyHubTheme') || 'auto');
  const [idle, setIdle] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try { setData(await api('/api/dashboard')); setError(''); }
    catch (e) { setError(`API offline. ${e.message || 'Showing local shell only.'}`); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const reset = () => {
      setIdle(false);
      clearTimeout(window.__idle);
      const s = { ...defaultScreenSaver, ...(data?.settings?.screenSaver || {}) };
      if (s.enabled) window.__idle = setTimeout(() => setIdle(true), Math.max(1, Number(s.minutes || 3)) * 60000);
    };
    ['mousemove','touchstart','keydown','click'].forEach(e => window.addEventListener(e, reset));
    reset();
    return () => ['mousemove','touchstart','keydown','click'].forEach(e => window.removeEventListener(e, reset));
  }, [data?.settings?.screenSaver]);
  useEffect(() => { localStorage.setItem('familyHubTheme', theme); document.documentElement.dataset.theme = theme; }, [theme]);

  const todayEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    return (data?.events || []).filter(e => String(e.start || '').slice(0,10) === today).sort((a,b)=>new Date(a.start)-new Date(b.start)).slice(0, 6);
  }, [data]);

  if (idle) return <Ambient data={data} onWake={() => setIdle(false)} />;

  return <div className="app-shell">
    <aside className="rail">
      <div className="brand"><Home size={26}/><span>Family Hub</span></div>
      <Nav tab={tab} setTab={setTab} />
      <button className="mode" onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}>{theme === 'night' ? <Sun/> : <Moon/>}<span>{theme === 'night' ? 'Day' : 'Night'}</span></button>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><p className="eyebrow">Household command centre</p><h1>{titleFor(tab)}</h1></div>
        <div className="top-actions"><button onClick={load}><RefreshCcw size={18}/> Refresh</button><Clock /></div>
      </header>
      {error && <div className="alert">{error}</div>}
      {!data ? <div className="card">Loading dashboard…</div> : <Screen tab={tab} data={data} setData={setData} todayEvents={todayEvents} />}
    </main>
  </div>;
}

function Nav({ tab, setTab }) {
  const items = [
    ['home', Home, 'Home'], ['calendar', CalendarDays, 'Calendar'], ['tasks', ListTodo, 'Tasks'], ['meals', Utensils, 'Meals'], ['grocery', ShoppingCart, 'Grocery'], ['notes', NotebookText, 'Notes'], ['photos', Image, 'Photos'], ['smart', Lightbulb, 'Smart Home'], ['screensaver', Monitor, 'Screensaver'], ['onboarding', Users, 'Setup'], ['readiness', ShieldCheck, 'Go Live'], ['settings', Settings, 'Settings']
  ];
  return <nav>{items.map(([id, Icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>;
}
function titleFor(tab) { return ({ home:'Today', calendar:'Calendar', tasks:'Tasks', meals:'Meal planner', grocery:'Grocery list', notes:'Family notes', photos:'Photo frame', smart:'Smart Home', screensaver:'Ambient screensaver', onboarding:'Household setup', readiness:'Go-live readiness', settings:'Settings' })[tab] || 'Dashboard'; }

function Screen({ tab, data, setData, todayEvents }) {
  if (tab === 'home') return <HomeScreen data={data} setData={setData} todayEvents={todayEvents} />;
  if (tab === 'calendar') return <CalendarScreen events={data.events || []} setData={setData} />;
  if (tab === 'tasks') return <TasksScreen data={data} setData={setData} />;
  if (tab === 'meals') return <MealsScreen meals={data.meals || {}} setData={setData} />;
  if (tab === 'grocery') return <ListScreen name="grocery" items={data.grocery || []} setData={setData} icon={<ShoppingCart/>} />;
  if (tab === 'notes') return <NotesScreen notes={data.notes || []} setData={setData} />;
  if (tab === 'photos') return <PhotoScreen photos={data.photos || []} />;
  if (tab === 'smart') return <SmartHomeScreen />;
  if (tab === 'screensaver') return <ScreensaverSettings settings={data.settings || {}} setData={setData} data={data} />;
  if (tab === 'onboarding') return <OnboardingScreen data={data} setData={setData} />;
  if (tab === 'readiness') return <ReadinessScreen />;
  return <SettingsScreen settings={data.settings || {}} setData={setData} />;
}

function HomeScreen({ data, setData, todayEvents }) {
  const openTasks = (data.tasks || []).filter(t => !t.done && !t.checked).slice(0, 6);
  const nextEvent = todayEvents[0];
  return <div className="grid home-grid">
    <section className="hero-card"><CloudSun size={38}/><div><p className="eyebrow">Morning summary</p><h2>Today is ready.</h2><p>{todayEvents.length} event(s), {openTasks.length} open task(s). {data.weather?.current ? `${data.weather.current.condition}, ${data.weather.current.temperature}°C in ${data.weather.location}.` : 'Weather loading.'}</p></div></section>
    <WeatherCard weather={data.weather} />
    <Card title="Next event" items={nextEvent ? [`${time(nextEvent.start)} — ${nextEvent.title}`] : []} empty="No more events today." />
    <Card title="Today’s calendar" items={todayEvents.map(e => `${time(e.start)} — ${e.title}`)} empty="No events today." />
    <Card title="Today’s tasks" items={openTasks.map(t => `${t.title}${t.assignee ? ' · ' + t.assignee : ''}`)} empty="No open tasks." />
    <Card title="Tonight’s meal" items={[mealTonight(data.meals)]} empty="No meal planned." />
  </div>;
}
function Card({ title, items, empty }) { return <section className="card"><h3>{title}</h3>{items?.filter(Boolean).length ? <ul>{items.filter(Boolean).map((x,i)=><li key={i}>{x}</li>)}</ul> : <p className="muted">{empty}</p>}</section>; }
function WeatherCard({ weather }) {
  if (!weather?.current) return <section className="card"><h3><CloudSun/> Weather</h3><p className="muted">Weather unavailable. Check location or internet.</p></section>;
  return <section className="card weather-card"><h3><CloudSun/> Weather</h3><div className="weather-now"><strong>{weather.current.temperature}°C</strong><span>{weather.current.condition}</span></div><p className="muted">{weather.location} · wind {weather.current.wind} km/h</p><div className="forecast-strip">{(weather.daily || []).slice(0,5).map(d => <div key={d.date}><b>{new Date(d.date).toLocaleDateString([], { weekday:'short' })}</b><span>{d.max}°/{d.min}°</span><small>{d.rain}% rain</small></div>)}</div></section>;
}
function time(v) { try { return new Date(v).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); } catch { return ''; } }
function mealTonight(meals={}) { const d = days[(new Date().getDay()+6)%7]; return meals[d]?.dinner || ''; }

function CalendarScreen({ events, setData }) {
  const [form, setForm] = useState({ title:'', start:'', end:'', location:'' });
  const add = async () => { if (!form.title || !form.start) return; await api('/api/events', { method:'POST', body: JSON.stringify({ ...form, source:'manual' }) }); setForm({ title:'', start:'', end:'', location:'' }); setData(await api('/api/dashboard')); };
  return <section className="card wide"><div className="view-toggle"><button>Month</button><button className="active-pill">Week</button><button>Day</button></div><div className="quick-form"><input placeholder="Event title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input type="datetime-local" value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/><input placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/><button onClick={add}>Add event</button></div><div className="timeline">{events.length ? events.slice(0,30).map(e => <div className="timeline-row" key={e.id}><span>{new Date(e.start).toLocaleDateString([], { weekday:'short', day:'numeric', month:'short' })}</span><strong>{e.title}</strong><em>{time(e.start)}</em></div>) : <p className="muted">No events loaded yet. Run webcal sync or add Apple CalDAV details.</p>}</div></section>;
}

function TasksScreen({ data, setData }) { return <div className="grid two"><ListScreen name="tasks" title="Today’s tasks" items={data.tasks || []} setData={setData} icon={<CheckSquare/>}/><section className="card"><h3><Bell/> Task rules</h3><ul><li>Use this for household jobs, reminders and family actions.</li><li>Assign to a person when needed.</li><li>Recurring tasks and rewards are planned for the next batch.</li></ul></section></div>; }
function ListScreen({ name, title, items, setData, icon }) {
  const [text, setText] = useState('');
  const add = async () => { if(!text.trim()) return; await api(`/api/${name}`, { method:'POST', body: JSON.stringify({ title:text, done:false, checked:false }) }); setText(''); setData(await api('/api/dashboard')); };
  const toggle = async (item) => { await api(`/api/${name}/${item.id}`, { method:'PATCH', body: JSON.stringify({ done: !(item.done || item.checked), checked: !(item.done || item.checked) }) }); setData(await api('/api/dashboard')); };
  return <section className="card wide"><h3>{icon} {title || 'List'}</h3><div className="add-row"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Add item…"/><button onClick={add}>Add</button></div><div className="check-list">{items.map(item => <button key={item.id} onClick={()=>toggle(item)} className={(item.done || item.checked) ? 'done item' : 'item'}><span>{item.done || item.checked ? '✓' : ''}</span>{item.title}</button>)}</div></section>;
}

function MealsScreen({ meals, setData }) {
  const update = async (day, field, value) => { const next = { ...meals, [day]: { ...(meals[day] || {}), [field]: value } }; await api('/api/meals/week', { method:'POST', body: JSON.stringify(next) }); setData(await api('/api/dashboard')); };
  return <section className="card wide meal-grid">{days.map(day => <div className="day-card" key={day}><h3>{day}</h3>{['breakfast','lunch','dinner'].map(field => <input key={field} placeholder={field} defaultValue={meals[day]?.[field] || ''} onBlur={e=>update(day, field, e.target.value)} />)}</div>)}</section>;
}
function NotesScreen({ notes, setData }) { return <ListScreen name="notes" title="Notes" items={notes.map(n=>({ ...n, title:n.text || n.title }))} setData={setData} icon={<NotebookText/>}/>; }
function PhotoScreen({ photos }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { if (!photos.length) return; const id = setInterval(() => setIndex(i => (i + 1) % photos.length), 7000); return () => clearInterval(id); }, [photos.length]);
  if (!photos.length) return <section className="photo-mode"><h2>Shared photo frame</h2><p>Add photos to <code>apps/api/data/photos</code> and refresh. JPG, PNG, WEBP and GIF are supported.</p></section>;
  return <section className="photo-mode slideshow"><img src={photos[index].url} alt={photos[index].name}/><div><h2>Shared photo frame</h2><p>{photos[index].name}</p></div></section>;
}

function SmartHomeScreen() {
  const [home, setHome] = useState(null);
  const [error, setError] = useState('');
  const load = async () => { try { setHome(await api('/api/smart-home/summary')); setError(''); } catch (e) { setError('Smart home bridge unavailable. Check Home Assistant settings.'); } };
  useEffect(() => { load(); }, []);
  const toggle = async (entity_id) => { await api('/api/smart-home/toggle', { method:'POST', body: JSON.stringify({ entity_id }) }); await load(); };
  if (error) return <section className="card wide"><h3><RadioTower/> Smart home</h3><p className="muted">{error}</p></section>;
  if (!home) return <section className="card wide">Loading smart home…</section>;
  if (!home.configured) return <section className="card wide smart-empty"><h3><Lightbulb/> Smart home bridge</h3><p>{home.message}</p><p className="muted">Ready for Home Assistant. Add the URL and long-lived token into <code>.env</code>, restart the API, then this becomes your Apple Home-style dashboard.</p></section>;
  return <div className="grid two">{(home.rooms || []).map(room => <section className="card" key={room.name}><h3>{room.name}</h3><div className="device-grid">{room.devices.map(d => <button key={d.entity_id} className="device-tile" onClick={() => toggle(d.entity_id)}><b>{d.name}</b><span>{d.type} · {d.state}</span></button>)}</div></section>)}<section className="card wide"><h3>Scenes</h3><div className="scene-row">{(home.scenes || []).map(scene => <button key={scene.entity_id} onClick={() => toggle(scene.entity_id)}>{scene.name}</button>)}</div></section></div>;
}

function ScreensaverSettings({ settings, setData, data }) {
  const [local, setLocal] = useState({ ...defaultScreenSaver, ...(settings.screenSaver || {}) });
  const save = async () => { await api('/api/settings', { method:'POST', body: JSON.stringify({ screenSaver: local }) }); setData(await api('/api/dashboard')); };
  return <div className="grid two"><section className="card wide"><h3><Monitor/> Ambient screensaver</h3><p className="muted">This controls what the wall display shows when nobody touches it.</p><label><input type="checkbox" checked={!!local.enabled} onChange={e=>setLocal({...local, enabled:e.target.checked})}/> Screensaver enabled</label><label>Idle timer in minutes<input type="number" min="1" max="60" value={local.minutes} onChange={e=>setLocal({...local, minutes:Number(e.target.value)})}/></label><label><input type="checkbox" checked={!!local.photoMode} onChange={e=>setLocal({...local, photoMode:e.target.checked})}/> Use family photo background</label><label><input type="checkbox" checked={!!local.showClock} onChange={e=>setLocal({...local, showClock:e.target.checked})}/> Show clock/date</label><label><input type="checkbox" checked={!!local.showWeather} onChange={e=>setLocal({...local, showWeather:e.target.checked})}/> Show weather</label><label><input type="checkbox" checked={!!local.showNextEvent} onChange={e=>setLocal({...local, showNextEvent:e.target.checked})}/> Show next event</label><label><input type="checkbox" checked={!!local.showTasks} onChange={e=>setLocal({...local, showTasks:e.target.checked})}/> Show remaining tasks</label><button onClick={save}>Save screensaver</button></section><section className="ambient-preview"><Ambient data={{...data, settings:{...settings, screenSaver:local}}} onWake={()=>{}} preview /></section></div>;
}

function OnboardingScreen({ data, setData }) {
  const [local, setLocal] = useState(data.settings || {});
  const save = async () => { await api('/api/settings', { method:'POST', body: JSON.stringify({ ...local, setupComplete: true }) }); setData(await api('/api/dashboard')); };
  return <section className="card wide setup"><h3><Users/> Household setup</h3><div className="setup-grid"><label>Family display name<input value={local.householdName || ''} placeholder="The Anthony Family" onChange={e=>setLocal({...local, householdName:e.target.value})}/></label><label>Weather location<input value={local.weatherLocation || ''} placeholder="Wakefield, UK" onChange={e=>setLocal({...local, weatherLocation:e.target.value})}/></label><label>Default calendar view<select value={local.calendarView || 'week'} onChange={e=>setLocal({...local, calendarView:e.target.value})}><option>day</option><option>week</option><option>month</option></select></label><label><input type="checkbox" checked={!!local.appleFirst} onChange={e=>setLocal({...local, appleFirst:e.target.checked})}/> Apple/iCloud first</label><label><input type="checkbox" checked={!!local.requirePinForSettings} onChange={e=>setLocal({...local, requirePinForSettings:e.target.checked})}/> Protect settings with PIN later</label></div><button onClick={save}>Save household setup</button></section>;
}

function ReadinessScreen() {
  const [readiness, setReadiness] = useState(null);
  const [error, setError] = useState('');
  const load = async () => { try { setReadiness(await api('/api/system/readiness')); setError(''); } catch(e) { setError('Could not load readiness checks.'); } };
  useEffect(() => { load(); }, []);
  const enable = async () => { await api('/api/system/go-live', { method:'POST', body: JSON.stringify({ enabled: true }) }); await load(); };
  if (error) return <section className="card wide"><h3>Go-live readiness</h3><p className="muted">{error}</p></section>;
  if (!readiness) return <section className="card wide">Checking go-live readiness…</section>;
  return <section className="card wide readiness"><div className="readiness-head"><div><p className="eyebrow">Release check</p><h2>{readiness.score}% ready</h2><p className="muted">Core system is {readiness.ok ? 'ready for beta deployment.' : 'not ready yet.'}</p></div><button onClick={enable}>{readiness.goLiveMode ? 'Go-live mode on' : 'Enable go-live mode'}</button></div><div className="check-list release-checks">{readiness.checks.map(c => <div key={c.id} className={c.ok ? 'release-row ok' : 'release-row warn'}><span>{c.ok ? '✓' : '!'}</span><div><b>{c.label}</b><small>{c.detail}</small></div></div>)}</div></section>;
}

function SettingsScreen({ settings, setData }) {
  const [local, setLocal] = useState(settings);
  const [status, setStatus] = useState(null);
  useEffect(() => { api('/api/system/status').then(setStatus).catch(()=>{}); }, []);
  const save = async () => { await api('/api/settings', { method:'POST', body: JSON.stringify(local) }); setData(await api('/api/dashboard')); };
  const backup = async () => { const res = await api('/api/system/backup', { method:'POST' }); alert(`Backup created: ${res.file}`); setStatus(await api('/api/system/status')); };
  const syncApple = async () => { const res = await api('/api/integrations/apple/sync', { method:'POST' }); alert(`Apple sync complete: ${res.imported} event(s)`); setData(await api('/api/dashboard')); };
  const syncWebcal = async () => { const res = await api('/api/integrations/webcal/sync', { method:'POST' }); alert(`iCloud public sync complete: ${res.imported} event(s)`); setData(await api('/api/dashboard')); };
  return <section className="card settings"><h3>Dashboard settings</h3><div className="settings-section"><h4><Eye/> Display</h4><label>Weather location<input value={local.weatherLocation || ''} onChange={e=>setLocal({...local, weatherLocation:e.target.value})}/></label><label>Calendar view<select value={local.calendarView || 'week'} onChange={e=>setLocal({...local, calendarView:e.target.value})}><option>day</option><option>week</option><option>month</option></select></label></div><div className="settings-section"><h4><CalendarDays/> Calendar</h4><label><input type="checkbox" checked={!!local.appleFirst} onChange={e=>setLocal({...local, appleFirst:e.target.checked})}/> Apple/iCloud first mode</label><label><input type="checkbox" checked={!!local.googleEnabled} onChange={e=>setLocal({...local, googleEnabled:e.target.checked})}/> Show Google connection options</label></div><div className="settings-section"><h4><Lightbulb/> Smart Home</h4><label>Home Assistant URL<input value={local.homeAssistantUrl || ''} onChange={e=>setLocal({...local, homeAssistantUrl:e.target.value})}/></label></div><div className="settings-section"><h4><Lock/> System</h4><div className="status-grid"><div><b>Version</b><span>{status?.version || 'checking…'}</span></div><div><b>API uptime</b><span>{status ? `${Math.floor(status.uptimeSeconds/60)} min` : 'checking…'}</span></div><div><b>Database</b><span>{status?.database?.ok ? `${status.database.backups} backup(s)` : 'checking…'}</span></div><div><b>Modules</b><span>{status ? Object.entries(status.modules).filter(([,v])=>v).map(([k])=>k).join(', ') : 'checking…'}</span></div></div></div><div className="button-row"><button onClick={save}>Save settings</button><button onClick={backup}>Create backup</button><button onClick={syncApple}>Sync Apple CalDAV</button><button onClick={syncWebcal}>Sync iCloud Webcal</button></div></section>;
}
function Ambient({ data, onWake, preview = false }) {
  const s = { ...defaultScreenSaver, ...(data?.settings?.screenSaver || {}) };
  const photo = s.photoMode ? data?.photos?.[0] : null;
  const today = new Date().toISOString().slice(0,10);
  const nextEvent = (data?.events || []).filter(e => String(e.start || '').slice(0,10) === today).sort((a,b)=>new Date(a.start)-new Date(b.start))[0];
  const tasksLeft = (data?.tasks || []).filter(t => !t.done && !t.checked).length;
  return <div className={photo ? 'ambient ambient-photo' : 'ambient'} onClick={onWake} style={photo ? { backgroundImage: `linear-gradient(rgba(2,6,23,.45), rgba(2,6,23,.45)), url(${photo.url})` } : undefined}>{s.showClock && <Clock large/>}<h1>{data?.settings?.householdName || 'Family Hub'}</h1>{s.showWeather && <p>{data?.weather?.current ? `${data.weather.current.condition} · ${data.weather.current.temperature}°C` : 'Weather loading'}</p>}{s.showNextEvent && nextEvent && <p>Next: {time(nextEvent.start)} · {nextEvent.title}</p>}{s.showTasks && <p>{tasksLeft} task(s) remaining</p>}{!preview && <small>Tap to wake</small>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
