import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.resolve('apps/api/data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

function defaultDb() {
  return {
    events: [],
    chores: [],
    meals: [],
    grocery: [],
    notes: [],
    setup: { complete: false }
  };
}

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb(), null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return defaultDb();
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'family-hub-api', time: new Date().toISOString() });
});

app.get('/api/dashboard', (_req, res) => {
  const db = readDb();
  res.json(db);
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

app.get('/setup', (_req, res) => {
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Family Hub Setup</title><style>body{font-family:system-ui;background:#080808;color:#fff;padding:32px}a,button{background:#c67f14;color:#000;padding:14px 18px;border-radius:12px;text-decoration:none;font-weight:800;border:0}section{max-width:720px;margin:auto}</style></head><body><section><h1>Family Hub Setup</h1><p>This is the one-QR setup page. Calendar, family members, chores, meals, photos and remote access setup will be connected here.</p><p><a href="http://localhost:5173">Open dashboard</a></p></section></body></html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Family Hub API running on http://0.0.0.0:${PORT}`);
});
