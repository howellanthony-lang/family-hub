# 🏡 Family Hub — Raspberry Pi

A complete, self-contained family organiser wall display for Raspberry Pi.

One command installs everything. It boots into a full-screen touchscreen dashboard for calendar, chores, meals, groceries, notes, weather and photo frame mode.

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
- Chores
- Meals
- Grocery list
- Notes
- Weather placeholder
- Photo frame placeholder
- One-QR setup concept
- API health endpoint
- Local JSON data store
- Raspberry Pi kiosk mode

## Important

Do not commit `.env`. Use `.env.example` as the template.
