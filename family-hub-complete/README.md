# 🏡 Family Hub — Raspberry Pi

A complete, self-contained family organizer wall display for Raspberry Pi.
One command installs everything. Boots directly into a full-screen touchscreen dashboard.

---

## What's included

| Feature | Details |
|---|---|
| 📅 Calendar | Month view, colour per family member, Google + Apple + iCloud sync |
| ✅ Chores | Assign tasks, award points, live leaderboard |
| 🍽️ Meals | 7-day planner with breakfast / lunch / dinner slots |
| 🛒 Grocery | Checklist with progress ring and quick-add |
| 🖼️ Photo frame | Full-screen clock + slideshow after 3 min idle |
| 🔐 Sign-in wizard | QR code onboarding — connect all accounts on first boot |
| 🌐 Remote access | Tailscale + API keys for access from anywhere |
| 📱 Mobile API | JavaScript + Python SDKs, REST API, Swagger docs |

---

## Quick Install (3 commands)

```bash
git clone https://github.com/YOUR_USERNAME/family-hub.git ~/family-hub
cd ~/family-hub
bash install.sh
```

Then reboot:
```bash
sudo reboot
```

On first boot the setup wizard launches automatically — scan QR codes to connect your Google and Apple accounts from your phone.

---

## Hardware

| Item | Recommended |
|---|---|
| Pi | Raspberry Pi 4 (4GB+) or Pi 5 |
| Storage | 32GB+ microSD or USB SSD |
| Display | Any HDMI touchscreen 7"–15.6" |
| OS | Raspberry Pi OS Desktop 64-bit |
| Node.js | v20+ (installer handles this) |

---

## File Structure

```
family-hub/
├── install.sh                    ← Run this first
├── .env.example                  ← Copy to .env and edit
├── .env                          ← Your secrets (gitignored)
├── package.json
│
├── apps/
│   ├── api/
│   │   ├── server.mjs            ← Main API server
│   │   ├── auth.mjs              ← API key authentication
│   │   ├── package.json
│   │   ├── sync/
│   │   │   ├── google.mjs        ← Google Calendar OAuth sync
│   │   │   ├── apple.mjs         ← Apple CalDAV sync
│   │   │   └── webcal.mjs        ← Public iCal / webcal feeds
│   │   └── data/                 ← Auto-created JSON database
│   │       ├── db.json
│   │       ├── google_token.json
│   │       └── apple_etags.json
│   │
│   └── ui/
│       ├── index.html
│       ├── vite.config.js
│       ├── package.json
│       └── src/
│           ├── main.jsx          ← Entry point (onboarding → dashboard)
│           ├── App.jsx           ← Main dashboard (6 tabs)
│           └── OnboardingPage.jsx← First-run setup wizard with QR codes
│
└── infra/
    ├── install.sh                ← Pi installer script
    ├── kiosk-launch.sh           ← Chromium kiosk with watchdog
    ├── docker-compose.yml        ← Optional Docker deployment
    ├── Dockerfile.api
    ├── Dockerfile.ui
    ├── nginx.conf
    └── setup-remote-access.sh   ← Tailscale + API key setup
```

---

## Configuration

```bash
nano ~/family-hub/.env
```

```env
PORT=3001
API_KEYS=                        # Leave blank for local-only (no auth needed)

# Your iCloud public calendar (already set up from your link)
WEBCAL_URLS=webcal://p114-caldav.icloud.com/published/2/YOUR_LINK

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_ID=primary

# Apple two-way sync
APPLE_USERNAME=you@icloud.com
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_CALENDAR_URL=              # Discovered automatically via Settings tab
```

After editing .env:
```bash
sudo systemctl restart family-hub-api
```

---

## Connecting accounts

### iCloud public calendar (read-only — already configured)
Your webcal URL is pre-filled. Works immediately after install.

### Google Calendar (two-way)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable **Google Calendar API**
3. OAuth consent screen → External → add your Gmail as test user
4. Credentials → Create OAuth Client → **TV and Limited Input devices**
5. Paste `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `.env`
6. Open **Settings tab** on the dashboard → Connect Google
7. Scan the QR code with your phone and approve

### Apple two-way sync
1. [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords → `+`
2. Name it "Family Hub" → copy the `xxxx-xxxx-xxxx-xxxx` password
3. Add `APPLE_USERNAME` and `APPLE_PASSWORD` to `.env`
4. Run: `curl http://localhost:3001/api/integrations/apple/calendars`
5. Copy the calendar URL into `APPLE_CALENDAR_URL` in `.env`

---

## Remote access from anywhere

```bash
bash infra/setup-remote-access.sh
```

This installs Tailscale, connects your Pi to your private network, generates an API key, and prints your remote URL. Access from your phone anywhere in the world.

---

## Useful commands

```bash
# Status
systemctl status family-hub-api family-hub-ui

# Logs
journalctl -u family-hub-api -f

# Restart after config change
sudo systemctl restart family-hub-api

# Force calendar sync
curl -X POST http://localhost:3001/api/integrations/webcal/sync

# Health check
curl http://localhost:3001/api/health

# Update
cd ~/family-hub && git pull && bash install.sh

# Reset onboarding wizard
# In browser console: localStorage.removeItem('onboardingComplete')
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Status (no auth) |
| GET/POST | `/api/events` | Calendar events |
| PATCH/DELETE | `/api/events/:id` | Update/delete event |
| GET/POST | `/api/chores` | Chores list |
| POST | `/api/chores/:id/complete` | Mark done |
| DELETE | `/api/chores/:id` | Delete chore |
| GET/POST | `/api/meals/week` | Weekly meal plan |
| DELETE | `/api/meals/:id` | Delete meal |
| GET/POST | `/api/grocery/items` | Grocery list |
| PATCH/DELETE | `/api/grocery/items/:id` | Update/delete item |
| GET | `/api/integrations/status` | Sync status |
| POST | `/api/integrations/google/auth/start` | Start Google OAuth |
| POST | `/api/integrations/google/sync` | Force Google sync |
| GET | `/api/integrations/apple/calendars` | Discover Apple calendars |
| POST | `/api/integrations/apple/sync` | Force Apple sync |
| POST | `/api/integrations/webcal/sync` | Force webcal sync |

Authentication: `X-API-Key: your_key` header (not required from localhost).

---

## Optional: Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then:
npm run docker:up
```

---

## Accessing from your phone

Find your Pi's IP:
```bash
hostname -I
```

Open on any device on your WiFi:
```
http://192.168.x.x:5173
```

---

## Troubleshooting

**API not starting:**
```bash
journalctl -u family-hub-api --since "5 minutes ago"
# Usually means a syntax error in .env or port already in use
```

**Port 3001 in use:**
```bash
sudo lsof -i :3001
# Change PORT= in .env and restart
```

**Chromium not launching on boot:**
```bash
bash ~/family-hub/infra/kiosk-launch.sh
# Check ~/.config/autostart/family-hub-kiosk.desktop exists
```

**Calendar not syncing:**
```bash
curl -X POST http://localhost:3001/api/integrations/webcal/sync
# Check response for error message
```
