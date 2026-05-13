import express from 'express';
import cors from 'cors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import QRCode from 'qrcode';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const UI_PORT = 5173;
const DATA_DIR = path.resolve('apps/api/data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

function defaultDb() {
  return {
    events: [],
    chores: [],
    meals: [],
    grocery: [],
    notes: [],
    setup: {
      complete: false,
      token: crypto.randomBytes(16).toString('hex'),
      familyName: '',
      familyMembers: [],
      modules: {
        calendar: true,
        chores: true,
        meals: true,
        grocery: true,
        notes: true,
        weather: true,
        photos: true,
        home: true
      },
      integrations: {
        googleCalendar: { status: 'not_connected', calendarId: 'primary' },
        appleCalendar: { status: 'not_connected', username: '', calendarUrl: '' },
        webcal: { status: 'not_connected', urls: [] },
        weather: { status: 'not_configured', location: '' },
        photos: { status: 'not_configured', folder: '' },
        homeAssistant: { status: 'not_configured', url: '' }
      }
    }
  };
}

function ensureSetupShape(db) {
  const fresh = defaultDb();
  db.setup = { ...fresh.setup, ...(db.setup || {}) };
  db.setup.modules = { ...fresh.setup.modules, ...(db.setup.modules || {}) };
  db.setup.integrations = { ...fresh.setup.integrations, ...(db.setup.integrations || {}) };
  if (!db.setup.token) db.setup.token = crypto.randomBytes(16).toString('hex');
  return db;
}

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb(), null, 2));
    }
    return ensureSetupShape(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
  } catch {
    return defaultDb();
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(ensureSetupShape(db), null, 2));
}

function publicSetup(db) {
  const ip = getLocalIp();
  const setupUrl = `http://${ip}:${PORT}/setup?token=${db.setup.token}`;
  return {
    ...db.setup,
    setupUrl,
    qrUrl: `http://${ip}:${PORT}/api/setup/qr.svg`,
    dashboardUrl: `http://${ip}:${UI_PORT}`,
    apiUrl: `http://${ip}:${PORT}`
  };
}

function tokenOk(req, db) {
  const token = req.query.token || req.body?.token || req.headers['x-setup-token'];
  return !db.setup.token || token === db.setup.token;
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'family-hub-api', time: new Date().toISOString(), ip: getLocalIp() });
});

app.get('/api/dashboard', (_req, res) => {
  res.json(readDb());
});

app.get('/api/setup/session', (_req, res) => {
  const db = readDb();
  res.json(publicSetup(db));
});

app.get('/api/setup/qr.svg', async (_req, res) => {
  const db = readDb();
  const setupUrl = publicSetup(db).setupUrl;
  const svg = await QRCode.toString(setupUrl, { type: 'svg', margin: 2, width: 360 });
  res.type('svg').send(svg);
});

app.post('/api/setup/family', (req, res) => {
  const db = readDb();
  if (!tokenOk(req, db)) return res.status(403).json({ error: 'Invalid setup token' });
  db.setup.familyName = req.body.familyName || db.setup.familyName;
  db.setup.familyMembers = Array.isArray(req.body.familyMembers) ? req.body.familyMembers : db.setup.familyMembers;
  writeDb(db);
  res.json(publicSetup(db));
});

app.post('/api/setup/integrations', (req, res) => {
  const db = readDb();
  if (!tokenOk(req, db)) return res.status(403).json({ error: 'Invalid setup token' });
  const { webcalUrls, appleUsername, appleCalendarUrl, googleCalendarId, weatherLocation, photoFolder, homeAssistantUrl } = req.body;
  if (googleCalendarId) db.setup.integrations.googleCalendar = { status: 'details_saved', calendarId: googleCalendarId };
  if (appleUsername || appleCalendarUrl) db.setup.integrations.appleCalendar = { status: 'details_saved', username: appleUsername || '', calendarUrl: appleCalendarUrl || '' };
  if (webcalUrls) db.setup.integrations.webcal = { status: 'details_saved', urls: String(webcalUrls).split(',').map(x => x.trim()).filter(Boolean) };
  if (weatherLocation) db.setup.integrations.weather = { status: 'details_saved', location: weatherLocation };
  if (photoFolder) db.setup.integrations.photos = { status: 'details_saved', folder: photoFolder };
  if (homeAssistantUrl) db.setup.integrations.homeAssistant = { status: 'details_saved', url: homeAssistantUrl };
  writeDb(db);
  res.json(publicSetup(db));
});

app.post('/api/setup/finish', (req, res) => {
  const db = readDb();
  if (!tokenOk(req, db)) return res.status(403).json({ error: 'Invalid setup token' });
  db.setup.complete = true;
  db.setup.completedAt = new Date().toISOString();
  writeDb(db);
  res.json(publicSetup(db));
});

app.get('/api/events', (_req, res) => res.json(readDb().events));
app.post('/api/events', (req, res) => {
  const db = readDb();
  const item = { id: Date.now().toString(), ...req.body };
  db.events.push(item);
  writeDb(db);
  res.status(201).json(item);
});

app.get('/api/chores', (_req, res) => res.json(readDb().chores));
app.post('/api/chores', (req, res) => {
  const db = readDb();
  const item = { id: Date.now().toString(), done: false, ...req.body };
  db.chores.push(item);
  writeDb(db);
  res.status(201).json(item);
});

app.get('/api/meals/week', (_req, res) => res.json(readDb().meals));
app.post('/api/meals/week', (req, res) => {
  const db = readDb();
  db.meals = Array.isArray(req.body) ? req.body : [req.body];
  writeDb(db);
  res.json(db.meals);
});

app.get('/api/grocery/items', (_req, res) => res.json(readDb().grocery));
app.post('/api/grocery/items', (req, res) => {
  const db = readDb();
  const item = { id: Date.now().toString(), checked: false, ...req.body };
  db.grocery.push(item);
  writeDb(db);
  res.status(201).json(item);
});

app.get('/setup', (req, res) => {
  const db = readDb();
  const setup = publicSetup(db);
  const token = req.query.token || '';
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Family Hub Setup</title><style>body{font-family:system-ui;background:#f8fafc;color:#111827;padding:24px}section{max-width:860px;margin:auto}.card{background:#fff;border:1px solid #e2e8f0;border-top:6px solid #16a34a;border-radius:22px;padding:20px;margin:16px 0;box-shadow:0 12px 35px rgba(15,23,42,.08)}.card:nth-of-type(even){border-top-color:#f97316}input,textarea{width:100%;padding:14px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#111827;margin:8px 0 14px}button,a.btn{background:#f97316;color:#111827;padding:14px 18px;border-radius:12px;text-decoration:none;font-weight:900;border:0;display:inline-block}.muted{color:#64748b}.ok{color:#16a34a}.qr{background:white;border-radius:18px;padding:16px;width:220px}</style></head><body><section><p class="muted">Family Hub</p><h1>Connect your Family Hub</h1><p class="muted">Scan this setup page from the Pi screen, then save your family, accounts and device settings.</p><div class="card"><h2>Scan QR</h2><img class="qr" src="/api/setup/qr.svg" alt="Family Hub setup QR"><p class="muted">${setup.setupUrl}</p></div><div class="card"><h2>1. Family</h2><input id="familyName" placeholder="Family name, e.g. Anthony Family" value="${setup.familyName || ''}"><textarea id="members" placeholder="Family members, one per line">${(setup.familyMembers || []).join('\n')}</textarea><button onclick="saveFamily()">Save family</button></div><div class="card"><h2>2. Accounts & sources</h2><input id="googleCalendarId" placeholder="Google calendar ID, usually primary"><input id="appleUsername" placeholder="Apple/iCloud email"><input id="appleCalendarUrl" placeholder="Apple CalDAV calendar URL"><textarea id="webcalUrls" placeholder="Public iCloud/webcal URLs, comma separated">${setup.integrations.webcal.urls?.join(', ') || ''}</textarea><input id="weatherLocation" placeholder="Weather location, e.g. East Ardsley"><input id="photoFolder" placeholder="Photo folder path, e.g. /home/mando3/Pictures/FamilyHub"><input id="homeAssistantUrl" placeholder="Home Assistant URL, e.g. http://homeassistant.local:8123"><button onclick="saveIntegrations()">Save account details</button></div><div class="card"><h2>3. Finish</h2><p class="muted">Dashboard: ${setup.dashboardUrl}</p><button onclick="finishSetup()">Finish setup</button> <a class="btn" href="${setup.dashboardUrl}">Open dashboard</a><p id="status" class="ok"></p></div></section><script>const token='${token}';async function post(url,body){const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Setup-Token':token},body:JSON.stringify({...body,token})});document.getElementById('status').textContent=res.ok?'Saved successfully':'Something did not save';return res.json()}function saveFamily(){post('/api/setup/family',{familyName:familyName.value,familyMembers:members.value.split('\n').map(x=>x.trim()).filter(Boolean)})}function saveIntegrations(){post('/api/setup/integrations',{googleCalendarId:googleCalendarId.value,appleUsername:appleUsername.value,appleCalendarUrl:appleCalendarUrl.value,webcalUrls:webcalUrls.value,weatherLocation:weatherLocation.value,photoFolder:photoFolder.value,homeAssistantUrl:homeAssistantUrl.value})}function finishSetup(){post('/api/setup/finish',{}).then(()=>{status.textContent='Setup complete. Open the dashboard.'})}</script></body></html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Family Hub API running on http://0.0.0.0:${PORT}`);
});
