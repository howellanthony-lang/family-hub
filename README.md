# Family Hub v2.1

A self-contained family wall dashboard for Raspberry Pi.

Boot into a full-screen touchscreen display with live calendar, tasks, meals, weather, photos and smart-home controls — all running locally on the Pi.

```
Apple Calendar  →  Family Hub  ←  Home Assistant
     ↓                ↓                ↓
  Calendar tab    Home screen    Smart Home tab
```

---

## Quick install

```bash
git clone https://github.com/howellanthony-lang/family-hub.git ~/family-hub
cd ~/family-hub
cp .env.example .env
nano .env           # fill in your values
npm run setup
bash install.sh
sudo reboot
```

After reboot open `http://YOUR_PI_IP:5173`

---

## .env reference

```env
PORT=3001
WEATHER_LOCATION=Wakefield, UK

# Apple Calendar — use an app-specific password, NOT your normal Apple password
# Generate at: appleid.apple.com → Sign-In and Security → App-Specific Passwords
APPLE_USERNAME=your@icloud.com
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_CALENDAR_URL=           # discover with: POST /api/calendar/discover

# Home Assistant
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=         # Profile → Long-Lived Access Tokens → Create Token
SMART_HOME_ENABLED=true

# Optional webcal feeds (comma-separated)
WEBCAL_URLS=

# Optional API key protection
API_KEYS=
```

---

## Screens

| Screen | What it shows |
|---|---|
| **Home** | Clock, weather forecast, today's events, open tasks |
| **Calendar** | Upcoming events, sync Apple Calendar / webcal |
| **Smart Home** | Live Home Assistant devices — lights, switches, media |
| **Photos** | Slideshow from your photo folder |
| **Meals** | Weekly meal planner |
| **Tasks** | Household task list |
| **Settings** | Display mode, weather location, system readiness |

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service health + version |
| GET | `/api/system/readiness` | Configuration checklist |
| GET | `/api/calendar/config` | Calendar integration status |
| POST | `/api/calendar/sync` | Pull events from Apple Calendar + webcal |
| GET | `/api/calendar/events` | All stored events |
| POST | `/api/calendar/discover` | Find your Apple CalDAV calendar URLs |
| GET | `/api/weather` | Live weather via Open-Meteo |
| GET | `/api/photos` | List photos in PHOTO_DIR |
| GET | `/api/homekit/summary` | HA entity summary |
| GET | `/api/homekit/devices` | Controllable devices |
| GET | `/api/homekit/cameras` | Camera entities |
| POST | `/api/homekit/toggle` | Toggle a device on/off |
| POST | `/api/scenes/:scene` | Activate a Home Assistant scene |
| GET | `/api/tasks` | Household tasks |
| GET | `/api/meals/week` | Weekly meal plan |

---

## Scripts

```bash
npm run setup        # install deps + build UI
npm run build:ui     # rebuild UI only
npm run update       # git pull + rebuild + restart services
npm run doctor       # check services, .env, disk, Node version
npm run smoke:test   # hit every API endpoint and report pass/fail
```

---

## Systemd services

| Service | Description |
|---|---|
| `family-hub-api` | Fastify API on port 3001 |
| `family-hub-ui` | Static UI served on port 5173 |

```bash
sudo systemctl status family-hub-api
sudo systemctl restart family-hub-api family-hub-ui
journalctl -u family-hub-api -f
```

---

## Apple Calendar setup

1. Go to **appleid.apple.com** → Sign-In and Security → App-Specific Passwords
2. Create a password named `family-hub` — copy the `xxxx-xxxx-xxxx-xxxx` token
3. Add `APPLE_USERNAME` and `APPLE_PASSWORD` to `.env`
4. Restart the API: `sudo systemctl restart family-hub-api`
5. Discover your calendar URL: `curl -X POST http://localhost:3001/api/calendar/discover`
6. Copy the URL into `APPLE_CALENDAR_URL=` in `.env` and restart again
7. Sync: `curl -X POST http://localhost:3001/api/calendar/sync`

---

## Home Assistant setup

1. Open Home Assistant → Profile (bottom-left) → Long-Lived Access Tokens → Create Token
2. Add to `.env`:
   ```
   HOME_ASSISTANT_URL=http://homeassistant.local:8123
   HOME_ASSISTANT_TOKEN=your_token
   ```
3. Restart: `sudo systemctl restart family-hub-api`
4. Test: `curl http://localhost:3001/api/homekit/summary`
