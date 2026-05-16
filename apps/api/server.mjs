import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ical from 'node-ical';

const VERSION = '2.1.0';
const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.resolve('apps/api/data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const PHOTO_DIR = path.resolve(process.env.PHOTO_DIR || 'apps/api/data/photos');
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || 'apps/api/data/backups');
const MAX_BACKUPS = Number(process.env.MAX_BACKUPS || 20);
const API_KEYS = (process.env.API_KEYS || '').split(',').map(v => v.trim()).filter(Boolean);

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// ── Database ─────────────────────────────────────────────────────────────────

const defaultDb = {
  meta: { version: VERSION, setupComplete: false, updatedAt: new Date().toISOString() },
  events: [],
  tasks: [],
  notes: [],
  meals: {
    monday: { breakfast: '', lunch: '', dinner: '' },
    tuesday: { breakfast: '', lunch: '', dinner: '' },
    wednesday: { breakfast: '', lunch: '', dinner: '' },
    thursday: { breakfast: '', lunch: '', dinner: '' },
    friday: { breakfast: '', lunch: '', dinner: '' },
    saturday: { breakfast: '', lunch: '', dinner: '' },
    sunday: { breakfast: '', lunch: '', dinner: '' }
  },
  grocery: [],
  settings: {
    theme: 'auto',
    weatherLocation: process.env.WEATHER_LOCATION || 'Wakefield, UK',
    householdName: 'Family Hub',
    smartHomeEnabled: Boolean(process.env.SMART_HOME_ENABLED),
    screenSaver: { enabled: true, minutes: 3, photoMode: true, nightDim: true }
  }
};

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DB_PATH); } catch { await writeDb(defaultDb); }
}
function normalizeDb(db) {
  db.meta = { ...(db.meta || {}), version: VERSION };
  if (!Array.isArray(db.tasks)) {
    db.tasks = [...(db.todos || []), ...(db.chores || [])].map(i => ({ assignee: 'Family', ...i }));
  }
  db.settings = { ...defaultDb.settings, ...(db.settings || {}), screenSaver: { ...defaultDb.settings.screenSaver, ...(db.settings?.screenSaver || {}) } };
  if (!db.meals || Array.isArray(db.meals)) db.meals = { ...defaultDb.meals };
  return db;
}
async function readDb() {
  await ensureDb();
  try { return normalizeDb(JSON.parse(await fs.readFile(DB_PATH, 'utf8'))); }
  catch (err) {
    app.log.error({ err }, 'db read failed — attempting restore');
    const restored = await restoreLatestBackup();
    if (restored) return restored;
    await fs.rename(DB_PATH, `${DB_PATH}.broken-${Date.now()}`).catch(() => {});
    await writeDb(defaultDb);
    return defaultDb;
  }
}
async function writeDb(db) {
  db.meta = { ...(db.meta || {}), version: VERSION, updatedAt: new Date().toISOString() };
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
  const files = (await fs.readdir(BACKUP_DIR)).filter(f => f.endsWith('.json')).sort().reverse();
  await Promise.all(files.slice(MAX_BACKUPS).map(f => fs.rm(path.join(BACKUP_DIR, f), { force: true })));
  return { ok: true, file: path.basename(target) };
}
async function restoreLatestBackup() {
  const files = (await fs.readdir(BACKUP_DIR).catch(() => [])).filter(f => f.endsWith('.json')).sort().reverse();
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
    const backups = (await fs.readdir(BACKUP_DIR).catch(() => [])).filter(f => f.endsWith('.json')).length;
    return { ok: true, sizeBytes: stat.size, updatedAt: stat.mtime.toISOString(), backups };
  } catch (err) { return { ok: false, error: err.message }; }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function isLocalhost(req) {
  const ip = req.ip || '';
  return ip.includes('127.0.0.1') || ip.includes('::1');
}
app.addHook('preHandler', async (req, reply) => {
  if (!req.url.startsWith('/api') || req.url === '/api/health') return;
  if (API_KEYS.length === 0) return;
  const key = req.headers['x-api-key'];
  if (!API_KEYS.includes(key) && !isLocalhost(req)) return reply.code(401).send({ error: 'Invalid API key' });
});

// ── Health & system ──────────────────────────────────────────────────────────

app.get('/api/health', async () => ({
  ok: true, version: VERSION, time: new Date().toISOString(),
  uptime: Math.round(process.uptime()), db: await dbStatus()
}));

app.get('/api/system/readiness', async () => {
  const db = await readDb();
  const status = await dbStatus();
  const haConfigured = Boolean(process.env.HOME_ASSISTANT_URL && process.env.HOME_ASSISTANT_TOKEN);
  const appleConfigured = Boolean(process.env.APPLE_USERNAME && process.env.APPLE_PASSWORD);
  const checks = [
    { id: 'api',           label: 'API running',                   ok: true,             detail: `v${VERSION} — uptime ${Math.round(process.uptime())}s` },
    { id: 'database',      label: 'Database readable',             ok: status.ok,        detail: status.ok ? `${status.backups} backup(s)` : status.error },
    { id: 'weather',       label: 'Weather location set',          ok: Boolean(db.settings?.weatherLocation || process.env.WEATHER_LOCATION), detail: db.settings?.weatherLocation || 'Set WEATHER_LOCATION in .env' },
    { id: 'apple',         label: 'Apple Calendar credentials',    ok: appleConfigured,  detail: appleConfigured ? 'APPLE_USERNAME + APPLE_PASSWORD set' : 'Set in .env — use an app-specific password' },
    { id: 'calendarUrl',   label: 'Apple Calendar URL set',        ok: Boolean(process.env.APPLE_CALENDAR_URL), detail: process.env.APPLE_CALENDAR_URL ? 'Set' : 'Run POST /api/calendar/discover to find your URL' },
    { id: 'homeAssistant', label: 'Home Assistant connected',      ok: haConfigured,     detail: haConfigured ? process.env.HOME_ASSISTANT_URL : 'Set HOME_ASSISTANT_URL + HOME_ASSISTANT_TOKEN in .env' },
    { id: 'photos',        label: 'Photo folder',                  ok: true,             detail: PHOTO_DIR },
    { id: 'security',      label: 'API key protection',            ok: API_KEYS.length > 0, detail: API_KEYS.length ? 'API_KEYS set' : 'Optional — set API_KEYS before exposing to network' }
  ];
  const score = Math.round(checks.filter(c => c.ok).length / checks.length * 100);
  return { ok: checks.filter(c => ['api','database'].includes(c.id)).every(c => c.ok), version: VERSION, score, checks };
});

app.post('/api/system/backup', async () => backupDb('manual'));

// ── Calendar config ──────────────────────────────────────────────────────────

app.get('/api/calendar/config', async () => {
  const appleUsername   = process.env.APPLE_USERNAME || '';
  const appleCalendarUrl = process.env.APPLE_CALENDAR_URL || '';
  const webcalUrls      = (process.env.WEBCAL_URLS || '').split(',').map(u => u.trim()).filter(Boolean);
  const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || '';
  return {
    apple: {
      configured: Boolean(appleUsername && process.env.APPLE_PASSWORD),
      username: appleUsername,
      calendarUrl: appleCalendarUrl,
      hasPassword: Boolean(process.env.APPLE_PASSWORD),
      note: 'Use an Apple app-specific password — not your normal Apple ID password. Generate one at appleid.apple.com → Sign-In and Security → App-Specific Passwords.'
    },
    webcal: { configured: webcalUrls.length > 0, urls: webcalUrls },
    google: { configured: Boolean(googleCalendarId), calendarId: googleCalendarId }
  };
});

app.post('/api/calendar/config', async (req, reply) => {
  // Write-back not supported — .env must be edited manually on Pi
  return reply.code(400).send({
    ok: false,
    error: 'Edit .env on the Pi directly to update calendar credentials. Then restart the API with: sudo systemctl restart family-hub-api'
  });
});

// ── Calendar sync & events ───────────────────────────────────────────────────

app.get('/api/calendar/events', async () => {
  const db = await readDb();
  return { ok: true, count: (db.events || []).length, events: db.events || [] };
});

app.post('/api/calendar/sync', async (req, reply) => {
  const results = { apple: null, webcal: null };

  // Apple CalDAV sync
  if (process.env.APPLE_USERNAME && process.env.APPLE_PASSWORD && process.env.APPLE_CALENDAR_URL) {
    try {
      const xml = await caldavRequest(
        process.env.APPLE_CALENDAR_URL,
        'REPORT',
        `<?xml version="1.0" encoding="utf-8"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"/></c:comp-filter></c:filter></c:calendar-query>`
      );
      const icsBlobs = xmlValues(xml, 'calendar-data');
      const appleEvents = icsBlobs.flatMap(ics => parseIcsEvents(ics));
      const db = await readDb();
      db.events = [...(db.events || []).filter(e => e.source !== 'apple-caldav'), ...appleEvents]
        .sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));
      await writeDb(db);
      results.apple = { ok: true, imported: appleEvents.length };
    } catch (err) {
      results.apple = { ok: false, error: err.message };
    }
  } else {
    results.apple = { ok: false, error: 'Apple Calendar not configured. Set APPLE_USERNAME, APPLE_PASSWORD, APPLE_CALENDAR_URL in .env' };
  }

  // Webcal sync
  const webcalUrls = (process.env.WEBCAL_URLS || '').split(',').map(u => u.trim()).filter(Boolean);
  if (webcalUrls.length > 0) {
    try {
      const events = [];
      for (const raw of webcalUrls) {
        const url = raw.replace(/^webcal:/, 'https:');
        try {
          const data = await ical.async.fromURL(url);
          for (const item of Object.values(data)) {
            if (item.type === 'VEVENT') {
              events.push({ id: item.uid || crypto.randomUUID(), title: item.summary || 'Event', start: item.start?.toISOString?.() || item.start, end: item.end?.toISOString?.() || item.end, source: 'webcal', location: item.location || '' });
            }
          }
        } catch (e) { app.log.warn({ e, url }, 'webcal url failed'); }
      }
      const db = await readDb();
      db.events = [...(db.events || []).filter(e => e.source !== 'webcal'), ...events]
        .sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));
      await writeDb(db);
      results.webcal = { ok: true, imported: events.length };
    } catch (err) {
      results.webcal = { ok: false, error: err.message };
    }
  } else {
    results.webcal = { ok: false, error: 'No WEBCAL_URLS configured' };
  }

  return { ok: true, results };
});

// Discover Apple CalDAV calendars (uses principal lookup)
app.post('/api/calendar/discover', async (req, reply) => {
  if (!process.env.APPLE_USERNAME || !process.env.APPLE_PASSWORD) {
    return reply.code(400).send({ ok: false, error: 'Set APPLE_USERNAME and APPLE_PASSWORD in .env first' });
  }
  try {
    const principalXml = await caldavRequest(
      'https://caldav.icloud.com/', 'PROPFIND',
      `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`,
      '0'
    );
    const match = principalXml.match(/<href[^>]*>(\/.+?\/principal\/)<\/href>/);
    if (!match) return reply.code(500).send({ ok: false, error: 'Could not find Apple principal URL' });
    const dsId = match[1].split('/').filter(Boolean)[0];
    const xml = await caldavRequest(
      `https://caldav.icloud.com/${dsId}/calendars/`, 'PROPFIND',
      `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>`
    );
    const hrefs = xmlValues(xml, 'href');
    const names = xmlValues(xml, 'displayname');
    const calendars = hrefs
      .map((h, i) => ({ name: names[i] || h.split('/').filter(Boolean).pop(), url: h.startsWith('http') ? h : `https://caldav.icloud.com${h}` }))
      .filter(c => !/inbox|outbox|notification|reminder/i.test(c.url));
    return { ok: true, dsId, calendars, hint: 'Copy the url of the calendar you want into APPLE_CALENDAR_URL in .env, then restart the API.' };
  } catch (err) {
    return reply.code(500).send({ ok: false, error: err.message });
  }
});

// ── Weather ───────────────────────────────────────────────────────────────────

app.get('/api/weather', async () => getWeather(await readDb()));

async function geocode(location) {
  const fallback = { name: location || 'Wakefield, UK', latitude: 53.6833, longitude: -1.4977, timezone: 'Europe/London' };
  if (!location) return fallback;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return fallback;
    return { name: `${first.name}${first.country ? ', ' + first.country : ''}`, latitude: first.latitude, longitude: first.longitude, timezone: first.timezone || 'Europe/London' };
  } catch { return fallback; }
}
function wxLabel(code) {
  const m = { 0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Showers',82:'Heavy showers',95:'Thunderstorm' };
  return m[Number(code)] || 'Mixed';
}
async function getWeather(db) {
  const location = process.env.WEATHER_LOCATION || db.settings?.weatherLocation || 'Wakefield, UK';
  const place = await geocode(location);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=${encodeURIComponent(place.timezone)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const data = await res.json();
    return {
      ok: true, location: place.name,
      current: { temperature: Math.round(data.current?.temperature_2m ?? 0), wind: Math.round(data.current?.wind_speed_10m ?? 0), condition: wxLabel(data.current?.weather_code) },
      daily: (data.daily?.time || []).map((date, i) => ({ date, condition: wxLabel(data.daily.weather_code?.[i]), max: Math.round(data.daily.temperature_2m_max?.[i] ?? 0), min: Math.round(data.daily.temperature_2m_min?.[i] ?? 0), rain: data.daily.precipitation_probability_max?.[i] ?? 0 }))
    };
  } catch (err) {
    return { ok: false, location: place.name, error: 'Weather unavailable', current: null, daily: [] };
  }
}

// ── Photos ────────────────────────────────────────────────────────────────────

app.get('/api/photos', async () => {
  await fs.mkdir(PHOTO_DIR, { recursive: true });
  const files = (await fs.readdir(PHOTO_DIR).catch(() => [])).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
  return { ok: true, count: files.length, photos: files.map(f => ({ name: f, url: `/api/photos/${encodeURIComponent(f)}` })) };
});
app.get('/api/photos/:file', async (req, reply) => {
  const safe = path.basename(req.params.file);
  return reply.type('image/*').send(await fs.readFile(path.join(PHOTO_DIR, safe)));
});

// ── Home Assistant / HomeKit bridge ──────────────────────────────────────────

async function fetchHaStates() {
  const base = process.env.HOME_ASSISTANT_URL?.replace(/\/$/, '');
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!base || !token) return null;
  const res = await fetch(`${base}/api/states`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HA returned ${res.status}`);
  return res.json();
}

const HA_NOT_CONFIGURED = {
  configured: false,
  message: 'Home Assistant not connected. Add HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN to .env, then restart the API.',
  setupSteps: [
    'Open Home Assistant in a browser',
    'Go to your Profile (bottom-left) → Long-Lived Access Tokens → Create Token',
    'Add to /home/mando3/family-hub/.env:',
    '  HOME_ASSISTANT_URL=http://homeassistant.local:8123',
    '  HOME_ASSISTANT_TOKEN=your_token_here',
    'Run: sudo systemctl restart family-hub-api'
  ]
};

app.get('/api/homeassistant/states', async (req, reply) => {
  try {
    const states = await fetchHaStates();
    if (!states) return { ...HA_NOT_CONFIGURED };
    return { ok: true, configured: true, count: states.length, states: states.map(s => ({ entity_id: s.entity_id, state: s.state, name: s.attributes?.friendly_name || s.entity_id, domain: s.entity_id.split('.')[0], attributes: s.attributes })) };
  } catch (err) {
    return reply.code(502).send({ ok: false, configured: true, error: err.message });
  }
});

app.get('/api/homekit/summary', async (req, reply) => {
  try {
    const states = await fetchHaStates();
    if (!states) return { status: 'not_configured', ...HA_NOT_CONFIGURED, entities: [] };
    const entities = states
      .filter(e => /^(light|switch|sensor|binary_sensor|cover|climate|lock|media_player)\./.test(e.entity_id))
      .map(e => ({ entity_id: e.entity_id, state: e.state, name: e.attributes?.friendly_name || e.entity_id, domain: e.entity_id.split('.')[0] }));
    return { status: 'ok', configured: true, url: process.env.HOME_ASSISTANT_URL, count: entities.length, entities };
  } catch (err) {
    return reply.code(502).send({ status: 'error', configured: true, error: err.message, entities: [] });
  }
});

app.get('/api/homekit/devices', async (req, reply) => {
  try {
    const states = await fetchHaStates();
    if (!states) return { ...HA_NOT_CONFIGURED, devices: [] };
    const devices = states
      .filter(s => /^(light|switch|cover|climate|lock|fan|vacuum)\./.test(s.entity_id))
      .map(s => ({ entity_id: s.entity_id, name: s.attributes?.friendly_name || s.entity_id, state: s.state, domain: s.entity_id.split('.')[0], area: s.attributes?.area_id || null }));
    return { ok: true, configured: true, count: devices.length, devices };
  } catch (err) {
    return reply.code(502).send({ ok: false, configured: true, error: err.message });
  }
});

app.get('/api/homekit/cameras', async (req, reply) => {
  try {
    const states = await fetchHaStates();
    if (!states) return { ...HA_NOT_CONFIGURED, cameras: [] };
    const cameras = states
      .filter(s => s.entity_id.startsWith('camera.'))
      .map(s => ({ entity_id: s.entity_id, name: s.attributes?.friendly_name || s.entity_id, state: s.state }));
    return { ok: true, configured: true, count: cameras.length, cameras };
  } catch (err) {
    return reply.code(502).send({ ok: false, configured: true, error: err.message });
  }
});

app.post('/api/scenes/:scene', async (req, reply) => {
  const base = process.env.HOME_ASSISTANT_URL?.replace(/\/$/, '');
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!base || !token) return reply.code(400).send({ ok: false, error: 'Home Assistant not configured' });
  try {
    const res = await fetch(`${base}/api/services/scene/turn_on`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: `scene.${req.params.scene}` })
    });
    if (!res.ok) return reply.code(res.status).send({ ok: false, error: await res.text() });
    return { ok: true };
  } catch (err) {
    return reply.code(502).send({ ok: false, error: err.message });
  }
});

app.post('/api/homekit/toggle', async (req, reply) => {
  const { entity_id } = req.body || {};
  if (!entity_id) return reply.code(400).send({ ok: false, error: 'entity_id required' });
  const base = process.env.HOME_ASSISTANT_URL?.replace(/\/$/, '');
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!base || !token) return reply.code(400).send({ ok: false, error: 'Home Assistant not configured' });
  try {
    const domain = entity_id.split('.')[0];
    const service = domain === 'scene' ? 'turn_on' : 'toggle';
    const res = await fetch(`${base}/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id })
    });
    if (!res.ok) return reply.code(res.status).send({ ok: false, error: await res.text() });
    return { ok: true };
  } catch (err) {
    return reply.code(502).send({ ok: false, error: err.message });
  }
});

// ── Collections (tasks, notes, grocery, events) ───────────────────────────────

function collectionRoutes(name) {
  app.get(`/api/${name}`, async () => (await readDb())[name] || []);
  app.post(`/api/${name}`, async (req) => {
    const db = await readDb();
    const item = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...req.body };
    db[name] = [item, ...(db[name] || [])];
    await writeDb(db);
    return item;
  });
  app.patch(`/api/${name}/:id`, async (req, reply) => {
    const db = await readDb();
    const idx = (db[name] || []).findIndex(i => i.id === req.params.id);
    if (idx === -1) return reply.code(404).send({ error: 'Not found' });
    db[name][idx] = { ...db[name][idx], ...req.body };
    await writeDb(db);
    return db[name][idx];
  });
  app.delete(`/api/${name}/:id`, async (req) => {
    const db = await readDb();
    db[name] = (db[name] || []).filter(i => i.id !== req.params.id);
    await writeDb(db);
    return { ok: true };
  });
}
['tasks', 'notes', 'grocery', 'events'].forEach(collectionRoutes);

// Legacy aliases
app.get('/api/todos', async () => (await readDb()).tasks || []);
app.get('/api/chores', async () => (await readDb()).tasks || []);

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

app.get('/api/dashboard', async () => {
  const db = await readDb();
  const [weather] = await Promise.all([getWeather(db)]);
  return { ...db, weather };
});

// ── CalDAV helpers ────────────────────────────────────────────────────────────

function appleAuthHeader() {
  if (!process.env.APPLE_USERNAME || !process.env.APPLE_PASSWORD) return null;
  return `Basic ${Buffer.from(`${process.env.APPLE_USERNAME}:${process.env.APPLE_PASSWORD}`).toString('base64')}`;
}
async function caldavRequest(url, method = 'REPORT', body = '', depth = '1') {
  const auth = appleAuthHeader();
  if (!auth) throw new Error('APPLE_USERNAME and APPLE_PASSWORD required');
  const res = await fetch(url, {
    method,
    headers: { Authorization: auth, Depth: depth, 'Content-Type': 'application/xml; charset=utf-8' },
    body: ['GET', 'HEAD'].includes(method) ? undefined : body
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`CalDAV ${res.status}: ${text.slice(0, 200)}`);
  return text;
}
function xmlValues(xml, tag) {
  const re = new RegExp(`<[^:>]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`, 'gi');
  return [...xml.matchAll(re)].map(m => {
    const inner = m[1];
    const cdata = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    return cdata ? cdata[1].trim() : inner.replace(/<[^>]+>/g, '').trim();
  }).filter(Boolean);
}
function parseIcsEvents(ics, source = 'apple-caldav') {
  const blocks = ics.split(/BEGIN:VEVENT/i).slice(1).map(x => 'BEGIN:VEVENT' + x.split(/END:VEVENT/i)[0] + 'END:VEVENT');
  const clean = v => (v || '').replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
  const read = (block, key) => { const m = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'mi')); return m ? clean(m[1].trim()) : ''; };
  const dt = v => {
    if (!v) return '';
    if (/^\d{8}$/.test(v)) return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00:00.000Z`;
    const m = v.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/);
    return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z` : v;
  };
  return blocks.map(b => ({ id: read(b,'UID') || crypto.randomUUID(), title: read(b,'SUMMARY') || 'Event', start: dt(read(b,'DTSTART')), end: dt(read(b,'DTEND')), location: read(b,'LOCATION'), source })).filter(e => e.start);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

await ensureDb();
await backupDb('startup').catch(err => app.log.warn({ err }, 'startup backup skipped'));
app.listen({ port: PORT, host: '0.0.0.0' });
