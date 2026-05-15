import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import ical from 'node-ical';

const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.resolve('apps/api/data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const PHOTO_DIR = path.resolve(process.env.PHOTO_DIR || 'apps/api/data/photos');
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || 'apps/api/data/backups');
const MAX_BACKUPS = Number(process.env.MAX_BACKUPS || 20);
const API_KEYS = (process.env.API_KEYS || '').split(',').map(v => v.trim()).filter(Boolean);

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const defaultDb = {
  meta: { version: '1.7.0', setupComplete: false, updatedAt: new Date().toISOString() },
  events: [],
  tasks: [
    { id: crypto.randomUUID(), title: 'Check today’s calendar', assignee: 'Family', points: 0, done: false },
    { id: crypto.randomUUID(), title: 'Plan tea for tonight', assignee: 'Family', points: 0, done: false },
    { id: crypto.randomUUID(), title: 'Tidy kitchen', assignee: 'Family', points: 5, done: false }
  ],
  notes: [{ id: crypto.randomUUID(), text: 'Welcome to Family Hub. Add notes here for the household.', pinned: true }],
  meals: {
    monday: { breakfast: '', lunch: '', dinner: 'Chicken pasta' },
    tuesday: { breakfast: '', lunch: '', dinner: '' },
    wednesday: { breakfast: '', lunch: '', dinner: '' },
    thursday: { breakfast: '', lunch: '', dinner: '' },
    friday: { breakfast: '', lunch: '', dinner: '' },
    saturday: { breakfast: '', lunch: '', dinner: '' },
    sunday: { breakfast: '', lunch: '', dinner: '' }
  },
  grocery: [
    { id: crypto.randomUUID(), title: 'Milk', checked: false },
    { id: crypto.randomUUID(), title: 'Bread', checked: false }
  ],
  settings: {
    theme: 'auto',
    calendarView: 'week',
    ambientMinutes: 3,
    weatherLocation: process.env.WEATHER_LOCATION || 'Wakefield, UK',
    appleFirst: true,
    googleEnabled: false,
    homeAssistantUrl: '',
    smartHomeEnabled: true,
    appleSyncEnabled: true,
    goLiveMode: false,
    requirePinForSettings: false,
    householdName: 'Family Hub',
    screenSaver: { enabled: true, minutes: 3, showClock: true, showWeather: true, showNextEvent: true, showTasks: true, photoMode: true, nightDim: true }
  }
};

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DB_PATH); } catch { await writeDb(defaultDb); }
}
function normalizeDb(db) {
  db.meta = { ...(db.meta || {}), version: '1.7.0' };
  if (!Array.isArray(db.tasks)) {
    const legacyTodos = Array.isArray(db.todos) ? db.todos : [];
    const legacyChores = Array.isArray(db.chores) ? db.chores : [];
    db.tasks = [...legacyTodos, ...legacyChores].map(item => ({ assignee: item.assignee || 'Family', ...item }));
  }
  db.settings = { ...(defaultDb.settings || {}), ...(db.settings || {}), screenSaver: { ...defaultDb.settings.screenSaver, ...(db.settings?.screenSaver || {}) } };
  return db;
}
async function readDb() {
  await ensureDb();
  try {
    return normalizeDb(JSON.parse(await fs.readFile(DB_PATH, 'utf8')));
  } catch (error) {
    app.log.error({ error }, 'database read failed');
    const restored = await restoreLatestBackup();
    if (restored) return restored;
    const broken = `${DB_PATH}.broken-${Date.now()}`;
    await fs.rename(DB_PATH, broken).catch(() => {});
    await writeDb(defaultDb);
    return defaultDb;
  }
}
async function writeDb(db) {
  db.meta = { ...(db.meta || {}), version: '1.7.0', updatedAt: new Date().toISOString() };
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_PATH);
  return db;
}
async function backupDb(reason = 'manual') {
  await ensureDb();
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(BACKUP_DIR, `db-${stamp}-${reason}.json`);
  await fs.copyFile(DB_PATH, target);
  await pruneBackups();
  return { ok: true, file: path.basename(target), path: target };
}
async function pruneBackups() {
  const files = (await fs.readdir(BACKUP_DIR).catch(() => []))
    .filter(f => f.startsWith('db-') && f.endsWith('.json'))
    .sort()
    .reverse();
  await Promise.all(files.slice(MAX_BACKUPS).map(f => fs.rm(path.join(BACKUP_DIR, f), { force: true })));
}
async function restoreLatestBackup() {
  const files = (await fs.readdir(BACKUP_DIR).catch(() => []))
    .filter(f => f.startsWith('db-') && f.endsWith('.json'))
    .sort()
    .reverse();
  for (const file of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(BACKUP_DIR, file), 'utf8'));
      await fs.copyFile(path.join(BACKUP_DIR, file), DB_PATH);
      return data;
    } catch {}
  }
  return null;
}
async function dbStatus() {
  try {
    const stat = await fs.stat(DB_PATH);
    const backupCount = (await fs.readdir(BACKUP_DIR).catch(() => [])).filter(f => f.endsWith('.json')).length;
    return { ok: true, sizeBytes: stat.size, updatedAt: stat.mtime.toISOString(), backups: backupCount };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const addresses = Object.values(interfaces)
    .flat()
    .filter(Boolean)
    .filter(item => item.family === 'IPv4' && !item.internal)
    .map(item => item.address);
  const host = addresses[0] || os.hostname();
  return {
    hostname: os.hostname(),
    ip: addresses[0] || '',
    uiUrl: `http://${host}:5173`,
    apiUrl: `http://${host}:3001`
  };
}
function isLocalhost(req) {
  const ip = req.ip || '';
  return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost');
}
app.addHook('preHandler', async (req, reply) => {
  if (!req.url.startsWith('/api')) return;
  if (req.url === '/api/health') return;
  if (API_KEYS.length === 0 && isLocalhost(req)) return;
  if (API_KEYS.length === 0) return;
  const key = req.headers['x-api-key'];
  if (!API_KEYS.includes(key)) return reply.code(401).send({ error: 'Invalid API key' });
});

app.get('/api/health', async () => ({ ok: true, version: '1.7.0', time: new Date().toISOString(), uptime: Math.round(process.uptime()), db: await dbStatus() }));

app.get('/api/system/status', async () => {
  const db = await readDb();
  return {
    ok: true,
    version: '1.7.0',
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    node: process.version,
    memory: process.memoryUsage(),
    database: await dbStatus(),
    network: getNetworkInfo(),
    modules: {
      dashboard: true,
      weather: true,
      photos: true,
      webcal: Boolean(process.env.WEBCAL_URLS),
      appleCalDAV: Boolean(process.env.APPLE_USERNAME && process.env.APPLE_PASSWORD && process.env.APPLE_CALENDAR_URL),
      homeAssistant: Boolean(db.settings?.homeAssistantUrl || process.env.HOME_ASSISTANT_URL)
    }
  };
});
app.post('/api/system/backup', async () => backupDb('manual'));
app.get('/api/system/backups', async () => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const files = (await fs.readdir(BACKUP_DIR)).filter(f => f.endsWith('.json')).sort().reverse();
  return { backups: files };
});
app.post('/api/system/reload', async () => ({ ok: true, message: 'Use npm run update or sudo systemctl restart family-hub-api on the Pi.' }));

app.get('/api/integrations/home-assistant/state', async (req, reply) => {
  const db = await readDb();
  const base = process.env.HOME_ASSISTANT_URL || db.settings?.homeAssistantUrl;
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!base || !token) return reply.code(400).send({ ok: false, error: 'Set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN in .env' });
  const res = await fetch(`${base.replace(/\/$/, '')}/api/states`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return reply.code(res.status).send({ ok: false, error: 'Home Assistant request failed' });
  const states = await res.json();
  return { ok: true, states: states.slice(0, 50).map(s => ({ entity_id: s.entity_id, state: s.state, name: s.attributes?.friendly_name })) };
});


app.post('/api/integrations/home-assistant/service', async (req, reply) => {
  const { domain, service, entity_id } = req.body || {};

  if (!process.env.HOME_ASSISTANT_URL || !process.env.HOME_ASSISTANT_TOKEN) {
    return reply.code(400).send({ ok: false, error: 'Home Assistant not configured' });
  }

  if (!domain || !service || !entity_id) {
    return reply.code(400).send({ ok: false, error: 'Missing domain, service or entity_id' });
  }

  const response = await fetch(`${process.env.HOME_ASSISTANT_URL.replace(/\/$/, '')}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HOME_ASSISTANT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ entity_id })
  });

  if (!response.ok) {
    return reply.code(response.status).send({ ok: false, error: 'Home Assistant service call failed' });
  }

  const result = await response.json().catch(() => []);
  return { ok: true, result };
});

app.get('/api/dashboard', async () => {
  const db = await readDb();
  const [weather, photos] = await Promise.all([getWeather(db), listPhotos()]);
  return { ...db, weather, photos, system: { network: getNetworkInfo() } };
});
app.get('/api/weather', async () => getWeather(await readDb()));
app.get('/api/photos', async () => ({ photos: await listPhotos() }));
app.get('/api/photos/:file', async (req, reply) => {
  const safe = path.basename(req.params.file);
  return reply.sendFile ? reply.sendFile(safe, PHOTO_DIR) : reply.type('image/*').send(await fs.readFile(path.join(PHOTO_DIR, safe)));
});


async function geocodeLocation(location) {
  const fallback = { name: location || 'Wakefield, UK', latitude: 53.6833, longitude: -1.4977, timezone: 'Europe/London' };
  if (!location) return fallback;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return fallback;
    return { name: `${first.name}${first.country ? ', ' + first.country : ''}`, latitude: first.latitude, longitude: first.longitude, timezone: first.timezone || 'Europe/London' };
  } catch {
    return fallback;
  }
}

function weatherCodeText(code) {
  const map = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers', 95: 'Thunderstorm' };
  return map[Number(code)] || 'Mixed conditions';
}

async function getWeather(db) {
  const location = process.env.WEATHER_LOCATION || db.settings?.weatherLocation || 'Wakefield, UK';
  const place = await geocodeLocation(location);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=${encodeURIComponent(place.timezone)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const data = await res.json();
    return {
      ok: true,
      location: place.name,
      current: {
        temperature: Math.round(data.current?.temperature_2m ?? 0),
        wind: Math.round(data.current?.wind_speed_10m ?? 0),
        condition: weatherCodeText(data.current?.weather_code)
      },
      daily: (data.daily?.time || []).map((date, i) => ({
        date,
        condition: weatherCodeText(data.daily.weather_code?.[i]),
        max: Math.round(data.daily.temperature_2m_max?.[i] ?? 0),
        min: Math.round(data.daily.temperature_2m_min?.[i] ?? 0),
        rain: data.daily.precipitation_probability_max?.[i] ?? 0
      }))
    };
  } catch (error) {
    return { ok: false, location: place.name, error: 'Weather unavailable', current: null, daily: [] };
  }
}

async function listPhotos() {
  await fs.mkdir(PHOTO_DIR, { recursive: true });
  const files = await fs.readdir(PHOTO_DIR).catch(() => []);
  return files
    .filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file))
    .map(file => ({ name: file, url: `/api/photos/${encodeURIComponent(file)}` }));
}


function appleAuthHeader() {
  if (!process.env.APPLE_USERNAME || !process.env.APPLE_PASSWORD) return null;
  return `Basic ${Buffer.from(`${process.env.APPLE_USERNAME}:${process.env.APPLE_PASSWORD}`).toString('base64')}`;
}
async function caldavRequest(url, method = 'REPORT', body = '') {
  const auth = appleAuthHeader();
  if (!auth) throw new Error('APPLE_USERNAME and APPLE_PASSWORD are required');
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: auth,
      Depth: method === 'PROPFIND' ? '1' : '1',
      'Content-Type': 'application/xml; charset=utf-8'
    },
    body: ['GET', 'HEAD'].includes(method) ? undefined : body
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`CalDAV ${res.status}: ${text.slice(0, 180)}`);
  return text;
}
function xmlValues(xml, tag) {
  const re = new RegExp(`<[^:>]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`, 'gi');
  return [...xml.matchAll(re)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
}
function parseIcsEvents(ics, source = 'apple-caldav') {
  const blocks = ics.split(/BEGIN:VEVENT/i).slice(1).map(x => 'BEGIN:VEVENT' + x.split(/END:VEVENT/i)[0] + 'END:VEVENT');
  const clean = v => (v || '').replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
  const read = (block, key) => {
    const m = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'mi'));
    return m ? clean(m[1].trim()) : '';
  };
  const dt = v => {
    if (!v) return '';
    if (/^\d{8}$/.test(v)) return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00:00.000Z`;
    const m = v.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/);
    if (!m) return v;
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`;
  };
  return blocks.map(block => ({
    id: read(block, 'UID') || crypto.randomUUID(),
    title: read(block, 'SUMMARY') || 'Apple Calendar event',
    start: dt(read(block, 'DTSTART')),
    end: dt(read(block, 'DTEND')),
    location: read(block, 'LOCATION'),
    source
  })).filter(e => e.start);
}
function toAppleIcs(event) {
  const uid = event.id || crypto.randomUUID();
  const fmt = v => new Date(v || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Family Hub//Apple CalDAV//EN\r\nBEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${fmt(new Date())}\r\nDTSTART:${fmt(event.start)}\r\nDTEND:${fmt(event.end || event.start)}\r\nSUMMARY:${String(event.title || 'Family Hub event').replace(/\r?\n/g, ' ')}\r\nLOCATION:${String(event.location || '').replace(/\r?\n/g, ' ')}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
}

function collectionRoutes(name) {
  app.get(`/api/${name}`, async () => (await readDb())[name] || []);
  app.post(`/api/${name}`, async (req) => {
    const db = await readDb();
    const item = { id: crypto.randomUUID(), ...req.body };
    db[name] = [item, ...(db[name] || [])];
    await writeDb(db);
    return item;
  });
  app.patch(`/api/${name}/:id`, async (req, reply) => {
    const db = await readDb();
    const list = db[name] || [];
    const index = list.findIndex(i => i.id === req.params.id);
    if (index === -1) return reply.code(404).send({ error: 'Not found' });
    list[index] = { ...list[index], ...req.body };
    await writeDb(db);
    return list[index];
  });
  app.delete(`/api/${name}/:id`, async (req) => {
    const db = await readDb();
    db[name] = (db[name] || []).filter(i => i.id !== req.params.id);
    await writeDb(db);
    return { ok: true };
  });
}
['tasks', 'notes', 'grocery', 'events'].forEach(collectionRoutes);


// Legacy aliases: old packages used /api/todos and /api/chores. Keep them working while the UI now says Tasks.
app.get('/api/todos', async () => (await readDb()).tasks || []);
app.get('/api/chores', async () => (await readDb()).tasks || []);
app.post('/api/todos', async (req) => { const db = await readDb(); const item = { id: crypto.randomUUID(), ...req.body }; db.tasks = [item, ...(db.tasks || [])]; await writeDb(db); return item; });
app.post('/api/chores', async (req) => { const db = await readDb(); const item = { id: crypto.randomUUID(), ...req.body }; db.tasks = [item, ...(db.tasks || [])]; await writeDb(db); return item; });

app.get('/api/meals/week', async () => (await readDb()).meals || {});
app.post('/api/meals/week', async (req) => {
  const db = await readDb();
  db.meals = { ...(db.meals || {}), ...req.body };
  await writeDb(db);
  return db.meals;
});

app.get('/api/settings', async () => (await readDb()).settings || {});
app.post('/api/settings', async (req) => {
  const db = await readDb();
  db.settings = { ...(db.settings || {}), ...req.body };
  await writeDb(db);
  return db.settings;
});

app.get('/api/summary/today', async () => {
  const db = await readDb();
  const today = new Date().toISOString().slice(0, 10);
  const events = (db.events || []).filter(e => String(e.start || '').startsWith(today)).slice(0, 6);
  const tasks = (db.tasks || []).filter(t => !t.done && !t.checked).slice(0, 8);
  return {
    title: 'Today’s family summary',
    date: today,
    message: `You have ${events.length} calendar item(s) and ${tasks.length} open task(s) waiting.`,
    events,
    tasks
  };
});

app.post('/api/integrations/webcal/sync', async () => {
  const urls = (process.env.WEBCAL_URLS || '').split(',').map(x => x.trim()).filter(Boolean);
  const events = [];
  for (const raw of urls) {
    const url = raw.replace(/^webcal:/, 'https:');
    try {
      const data = await ical.async.fromURL(url);
      for (const item of Object.values(data)) {
        if (item.type === 'VEVENT') {
          events.push({
            id: item.uid || crypto.randomUUID(),
            title: item.summary || 'Calendar event',
            start: item.start?.toISOString?.() || item.start,
            end: item.end?.toISOString?.() || item.end,
            source: 'webcal',
            location: item.location || ''
          });
        }
      }
    } catch (error) {
      app.log.warn({ error, url }, 'webcal sync failed');
    }
  }
  const db = await readDb();
  const manual = (db.events || []).filter(e => e.source !== 'webcal');
  db.events = [...manual, ...events].sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));
  await writeDb(db);
  return { ok: true, imported: events.length };
});


app.get('/api/integrations/apple/calendars', async (req, reply) => {
  try {
    const username = process.env.APPLE_USERNAME;
    if (!username || !process.env.APPLE_PASSWORD) return reply.code(400).send({ ok: false, error: 'Set APPLE_USERNAME and APPLE_PASSWORD in .env first' });
    const base = `https://caldav.icloud.com/${encodeURIComponent(username)}/calendars/`;
    const xml = await caldavRequest(base, 'PROPFIND', `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>`);
    const hrefs = xmlValues(xml, 'href');
    const calendars = hrefs.filter(h => /\/calendars\//.test(h) && !/inbox|outbox|notification/i.test(h)).map(h => ({ name: decodeURIComponent(h.split('/').filter(Boolean).pop() || 'Calendar'), url: h.startsWith('http') ? h : `https://caldav.icloud.com${h}` }));
    return { ok: true, calendars };
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
});

app.post('/api/integrations/apple/sync', async (req, reply) => {
  try {
    const url = process.env.APPLE_CALENDAR_URL;
    if (!url) return reply.code(400).send({ ok: false, error: 'Set APPLE_CALENDAR_URL in .env first' });
    const xml = await caldavRequest(url, 'REPORT', `<?xml version="1.0" encoding="utf-8"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"/></c:comp-filter></c:filter></c:calendar-query>`);
    const icsBlobs = xmlValues(xml, 'calendar-data');
    const appleEvents = icsBlobs.flatMap(ics => parseIcsEvents(ics));
    const db = await readDb();
    const manual = (db.events || []).filter(e => e.source !== 'apple-caldav');
    db.events = [...manual, ...appleEvents].sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));
    await writeDb(db);
    return { ok: true, imported: appleEvents.length };
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
});

app.post('/api/integrations/apple/events', async (req, reply) => {
  try {
    const base = process.env.APPLE_CALENDAR_URL;
    if (!base) return reply.code(400).send({ ok: false, error: 'Set APPLE_CALENDAR_URL in .env first' });
    const event = { id: crypto.randomUUID(), ...req.body, source: 'apple-caldav' };
    const target = `${base.replace(/\/$/, '')}/${event.id}.ics`;
    const auth = appleAuthHeader();
    const res = await fetch(target, { method: 'PUT', headers: { Authorization: auth, 'Content-Type': 'text/calendar; charset=utf-8' }, body: toAppleIcs(event) });
    if (!res.ok) return reply.code(res.status).send({ ok: false, error: await res.text() });
    const db = await readDb();
    db.events = [event, ...(db.events || [])];
    await writeDb(db);
    return { ok: true, event };
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
});

app.get('/api/smart-home/summary', async (req, reply) => {
  const db = await readDb();
  const configured = Boolean(process.env.HOME_ASSISTANT_URL && process.env.HOME_ASSISTANT_TOKEN);
  if (!configured) return { ok: true, configured: false, rooms: [], scenes: [], message: 'Set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN to enable live smart-home controls.' };
  try {
    const base = process.env.HOME_ASSISTANT_URL.replace(/\/$/, '');
    const res = await fetch(`${base}/api/states`, { headers: { Authorization: `Bearer ${process.env.HOME_ASSISTANT_TOKEN}` } });
    const states = await res.json();
    const useful = states.filter(s => /^(light|switch|climate|sensor|camera)\./.test(s.entity_id)).slice(0, 80);
    const rooms = Object.values(useful.reduce((acc, s) => {
      const area = (s.attributes?.area_id || s.attributes?.friendly_name?.split(' ')[0] || 'Home').toString();
      acc[area] ||= { name: area, devices: [] };
      acc[area].devices.push({ entity_id: s.entity_id, name: s.attributes?.friendly_name || s.entity_id, state: s.state, type: s.entity_id.split('.')[0] });
      return acc;
    }, {}));
    return { ok: true, configured: true, rooms, scenes: states.filter(s => s.entity_id.startsWith('scene.')).slice(0, 20).map(s => ({ entity_id: s.entity_id, name: s.attributes?.friendly_name || s.entity_id })) };
  } catch (error) {
    return reply.code(500).send({ ok: false, configured: true, error: error.message });
  }
});

app.post('/api/smart-home/toggle', async (req, reply) => {
  try {
    const { entity_id } = req.body || {};
    if (!entity_id) return reply.code(400).send({ ok: false, error: 'entity_id required' });
    const domain = entity_id.split('.')[0];
    const base = process.env.HOME_ASSISTANT_URL?.replace(/\/$/, '');
    if (!base || !process.env.HOME_ASSISTANT_TOKEN) return reply.code(400).send({ ok: false, error: 'Home Assistant not configured' });
    const service = ['light','switch'].includes(domain) ? 'toggle' : domain === 'scene' ? 'turn_on' : 'turn_on';
    const res = await fetch(`${base}/api/services/${domain}/${service}`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.HOME_ASSISTANT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ entity_id }) });
    if (!res.ok) return reply.code(res.status).send({ ok: false, error: await res.text() });
    return { ok: true };
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
});


app.get('/api/system/readiness', async () => {
  const db = await readDb();
  const status = await dbStatus();
  const checks = [
    { id: 'api', label: 'API is running', ok: true, detail: `Uptime ${Math.round(process.uptime())}s` },
    { id: 'database', label: 'Database readable', ok: status.ok, detail: status.ok ? `${status.backups} backup(s)` : status.error },
    { id: 'weather', label: 'Weather configured', ok: Boolean(db.settings?.weatherLocation || process.env.WEATHER_LOCATION), detail: db.settings?.weatherLocation || process.env.WEATHER_LOCATION || 'Set a weather location' },
    { id: 'webcal', label: 'iCloud public calendar feed configured', ok: Boolean(process.env.WEBCAL_URLS), detail: process.env.WEBCAL_URLS ? 'Configured' : 'Optional but recommended' },
    { id: 'apple', label: 'Apple CalDAV ready', ok: Boolean(process.env.APPLE_USERNAME && process.env.APPLE_PASSWORD && process.env.APPLE_CALENDAR_URL), detail: 'Needs Apple username, app-specific password and calendar URL' },
    { id: 'photos', label: 'Photo folder ready', ok: true, detail: PHOTO_DIR },
    { id: 'homeAssistant', label: 'Home Assistant configured', ok: Boolean(process.env.HOME_ASSISTANT_URL && process.env.HOME_ASSISTANT_TOKEN), detail: 'Optional smart-home bridge' },
    { id: 'security', label: 'API key protection', ok: API_KEYS.length > 0, detail: API_KEYS.length ? 'API keys set' : 'Set API_KEYS before remote access' }
  ];
  const required = checks.filter(c => ['api','database','weather'].includes(c.id));
  const recommended = checks.filter(c => !['api','database','weather'].includes(c.id));
  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
  return { ok: required.every(c => c.ok), score, checks, required, recommended, goLiveMode: Boolean(db.settings?.goLiveMode), version: '1.7.0' };
});

app.post('/api/system/go-live', async (req) => {
  const db = await readDb();
  db.settings = { ...(db.settings || {}), goLiveMode: Boolean(req.body?.enabled), requirePinForSettings: Boolean(req.body?.requirePinForSettings ?? db.settings?.requirePinForSettings) };
  await writeDb(db);
  return { ok: true, settings: db.settings };
});

app.get('/api/integrations/status', async () => ({
  apple: { enabled: Boolean(process.env.APPLE_USERNAME && process.env.APPLE_PASSWORD), mode: 'CalDAV discover/sync/create ready' },
  webcal: { enabled: Boolean(process.env.WEBCAL_URLS), mode: 'read-only' },
  google: { enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), hiddenByDefault: true },
  homeAssistant: { enabled: Boolean((await readDb()).settings?.homeAssistantUrl) }
}));

await ensureDb();
await backupDb('startup').catch(error => app.log.warn({ error }, 'startup backup failed'));
app.listen({ port: PORT, host: '0.0.0.0' });
