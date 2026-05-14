# 🏡 Family Hub — Raspberry Pi

A self-contained family organiser wall display for Raspberry Pi.

Family Hub boots into a full-screen touchscreen dashboard for calendar, tasks, meals, groceries, notes, weather, photo frame/screensaver mode and smart-home controls.

## Current direction — v1.8

Family Hub is now **Home Assistant-first**.

That means:

- Home Assistant is the main integration layer for smart-home devices, scenes, sensors, presence and calendar entities.
- Apple/iCloud calendars should ideally connect into Home Assistant, then surface on Family Hub.
- Direct Apple CalDAV remains an optional fallback, not the main path.
- Family Hub is the wall-mounted dashboard and household interface.

```text
Apple/iCloud Calendar + Smart Home Devices
                ↓
          Home Assistant
                ↓
        Family Hub Dashboard
```

## Quick install on Raspberry Pi

```bash
git clone https://github.com/howellanthony-lang/family-hub.git ~/family-hub
cd ~/family-hub
bash install.sh
sudo reboot
```

After reboot, open:

```text
http://YOUR_PI_IP:5173
```

API:

```text
http://YOUR_PI_IP:3001
```

## Future update flow

Once the repo is fully aligned with the live Pi build, updates should be:

```bash
cd ~/family-hub
git pull
bash install.sh
sudo reboot
```

Until v1.8 is fully verified, keep the current working Pi v1.7 install as the stable local build.

## Recommended hardware

| Item | Recommended |
|---|---|
| Pi | Raspberry Pi 4 4GB+ or Raspberry Pi 5 |
| Storage | 32GB+ microSD or USB SSD |
| Display | HDMI touchscreen 7–15.6 inch |
| OS | Raspberry Pi OS Desktop 64-bit |
| Node.js | v20+ installed by installer |

## Current modules

- Dashboard home screen
- Calendar events
- Tasks
- Meals
- Grocery list
- Notes
- Weather
- Photo frame / ambient screensaver mode
- Household setup flow
- API health endpoint
- Readiness endpoint
- Local JSON data store with backups
- Raspberry Pi kiosk mode
- Home Assistant integration foundation

## Environment configuration

Do not commit `.env`. Use `.env.example` as the template.

Important values:

```env
PORT=3001
API_KEYS=
WEATHER_LOCATION=Wakefield, UK
WEBCAL_URLS=
HOME_ASSISTANT_URL=
HOME_ASSISTANT_TOKEN=
APPLE_USERNAME=
APPLE_PASSWORD=
APPLE_CALENDAR_URL=
```

Leave Home Assistant values blank until you have a real Home Assistant URL and long-lived access token.

## Useful checks on the Pi

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/system/readiness
systemctl status family-hub-api family-hub-ui --no-pager
journalctl -u family-hub-api -n 80 --no-pager
```

## Go-live blockers

Before daily household use:

- Home Assistant connection tested, if smart-home control is needed.
- API key configured before remote access.
- Dashboard survives reboot.
- Screensaver/ambient mode tested.
- Calendar source confirmed.
- 24-hour stability test completed.

## Important

Use **Tasks**, not Chores, across the product.
