# Family Hub — Full Expansion Roadmap

Family Hub is not just a Raspberry Pi dashboard. It is a local-first household operating system designed for a wall-mounted touchscreen, with an Apple Home-inspired interface, Apple/iCloud-first calendar syncing, smart home controls, family organisation, routines, media, photos, and an optional JARVIS-style assistant layer.

## Product Direction

Build a premium family command centre that feels calm, visual, fast, and useful at a glance.

Core principles:

- Apple/iCloud-first, Google optional later.
- Local-first where possible.
- Raspberry Pi touchscreen-first.
- Original UI inspired by Apple Home, not a direct copy.
- Fast boot into kiosk mode.
- No secrets committed to GitHub.
- Simple enough for a normal family to use every day.
- Powerful enough to grow into a sellable product.

---

## Milestone 0 — Stabilise the Base

Goal: make the existing install and project structure reliable before expanding.

Tasks:

- Confirm `bash install.sh` works on Raspberry Pi OS Desktop 64-bit.
- Confirm API service starts correctly through systemd.
- Confirm UI service starts correctly through systemd.
- Confirm Chromium kiosk autostart works after reboot.
- Confirm `.env.example` contains templates only and no real secrets.
- Confirm `/apps/api/data` is gitignored.
- Add troubleshooting page for install failures.
- Add health/status card to dashboard.
- Add last-sync timestamps for each integration.

Success criteria:

- Fresh Pi install reaches dashboard after reboot.
- API and UI services restart automatically.
- No private credentials are committed.

---

## Milestone 1 — Apple Home-Inspired Dashboard MVP

Goal: replace the basic dashboard with a premium touchscreen UI.

Core layout:

- Top status chips:
  - Weather
  - Climate
  - Lights
  - Security
  - Media
  - WiFi/API status
- Main card area:
  - Cameras preview
  - Today summary
  - Calendar now/next
  - To-do list
- Scenes row:
  - Leave Home
  - Good Night
  - Morning Routine
  - Baby Mode
  - Dinner Time
- Room/device sections:
  - Living Room
  - Bedroom
  - Kitchen
  - Nursery
  - Office
- Bottom dock:
  - Home
  - Calendar
  - Automation
  - Family
  - Photos
  - Settings

UI rules:

- White/black base.
- Green and orange accents.
- Large rounded cards.
- Glass/blur effects.
- Large touch targets.
- Landscape-first design.
- Works from 7 inch to 15.6 inch touchscreens.
- Greeting should be configurable: `Good morning` or `Good morning, Name`.

Success criteria:

- Dashboard looks like a consumer-grade wall display.
- Touch controls are clear from arm’s length.
- No Apple assets or copyrighted UI copied directly.

---

## Milestone 2 — Apple/iCloud Calendar System

Goal: make Apple/iCloud calendars the primary calendar experience.

Features:

- CalDAV account connection using iCloud username and app-specific password.
- Calendar discovery endpoint.
- Multiple calendars supported.
- Calendar colour mapping.
- Family member labels.
- Read-only webcal support.
- Two-way CalDAV sync where supported.
- Month view.
- Week view.
- Day view.
- Agenda view.
- Today timeline card.
- Event creation from dashboard.
- Event editing from dashboard.
- Conflict detection.
- Birthday and anniversary reminder cards.

Success criteria:

- User can connect Apple/iCloud calendars without Google.
- Multiple calendars appear with clear colours.
- Today/tomorrow views are useful at a glance.

---

## Milestone 3 — Morning and Evening Briefing

Goal: make the hub feel alive and useful without needing to tap around.

Morning briefing:

- Today’s date.
- Weather summary.
- Calendar highlights.
- School/work reminders.
- Top chores.
- Meal plan.
- Grocery reminders.
- Baby/pregnancy countdown card.
- Travel/traffic placeholder.

Evening briefing:

- Tomorrow preview.
- Unfinished tasks.
- Prep reminders.
- Weather tomorrow.
- Good night scene shortcut.
- Photo frame transition.

Success criteria:

- Hub automatically shows the right information for the time of day.
- Briefing can be shown on wake, after idle, or from dock.

---

## Milestone 4 — Family Organisation Modules

Goal: make the hub useful beyond calendars.

Modules:

### Chores

- Assign chores to family members.
- Recurring chores.
- Points.
- Streaks.
- Parent approval mode.
- Weekly leaderboard.
- Reward shop.

### Meals

- 7-day planner.
- Breakfast/lunch/dinner slots.
- Favourite meals.
- Meal ideas.
- Meal prep reminders.
- Send ingredients to grocery list.

### Grocery

- Quick add.
- Categories.
- Completion progress.
- Shared list.
- Recently bought items.

### Notes

- Sticky notes.
- Family message board.
- Pin important notes.
- QR add-from-phone flow.

### To-do

- Today’s tasks.
- Shared tasks.
- Personal tasks.
- Overdue state.
- One-tap complete.

Success criteria:

- Family can manage daily life without opening multiple apps.

---

## Milestone 5 — Home Assistant Smart Home Layer

Goal: create Apple Home-style smart home controls using Home Assistant as the backend.

Features:

- Home Assistant connection settings.
- Token/API URL setup.
- Rooms.
- Lights.
- Plugs.
- Heating.
- Sensors.
- Cameras.
- Door/window sensors.
- Scenes.
- Automations.
- Energy cards.
- Home status: home, away, night, secure.

UI:

- Room cards.
- Device tiles.
- Scene buttons.
- Live state updates.
- Clear online/offline states.

Success criteria:

- Family Hub can control and display home devices through Home Assistant.
- UI feels familiar to Apple Home users.

---

## Milestone 6 — Photo Frame and Ambient Mode

Goal: make the wall display useful and beautiful when idle.

Features:

- Idle slideshow after configurable time.
- Shared local photo folder.
- Clock overlay.
- Weather overlay.
- Calendar alert overlay.
- Baby/family album mode.
- Screen dimming.
- Burn-in protection.
- Wake on touch.
- Future PIR wake sensor support.

Success criteria:

- When not being actively used, the display becomes a calm family photo frame.

---

## Milestone 7 — Mobile Companion Web App

Goal: make the hub usable from phones without needing a native app first.

Features:

- Mobile-friendly web UI.
- QR pairing.
- Add tasks from phone.
- Add grocery items from phone.
- Add meals from phone.
- Add notes from phone.
- Upload photos later.
- Remote access through Tailscale.
- API key auth.

Success criteria:

- Family members can update the hub from their phones.

---

## Milestone 8 — JARVIS-Style Assistant Layer

Goal: add a useful assistant interface without making the whole product dependent on AI.

Possible commands:

- What’s on today?
- Show tomorrow.
- Add milk to the shopping list.
- Add a note.
- Start good night mode.
- What chores are left?
- What’s for tea?
- Show nursery reminders.

Technical direction:

- Start with text command overlay.
- Add voice later.
- Keep privacy settings clear.
- Consider local-first AI where possible.
- Avoid sending sensitive family data to third parties without explicit opt-in.

Success criteria:

- Assistant makes the hub faster to use, not more complicated.

---

## Milestone 9 — AirPlay and Media Research

Goal: explore media and casting without overpromising.

Features to research:

- AirPlay-compatible receiving on Raspberry Pi.
- Photo casting.
- Music/media tile.
- Speaker controls.
- TV mode.
- Screen mirroring feasibility.
- Family announcement chime.

Success criteria:

- Clear decision made on what is reliable enough to support.

---

## Milestone 10 — Productisation and Monetisation

Goal: prepare Family Hub to become a real product.

Possible business models:

- Free open-source core.
- Premium themes.
- Hosted backup/sync.
- Setup service.
- Pre-built SD card image.
- Hardware kit.
- Smart home setup package.
- Family Hub Pro subscription later.

Product requirements:

- Clean README.
- Install guide.
- Screenshots.
- Demo mode.
- Release builds.
- Changelog.
- Licence decision.
- Website/landing page.
- Branding system.

Success criteria:

- A normal person can understand what Family Hub is, install it, and see why it is valuable.

---

## Technical Backlog

Frontend:

- Component library.
- Card component.
- Chip component.
- Dock component.
- Scene button component.
- Room section component.
- Device tile component.
- Modal/sheet component.
- Theme variables.
- Responsive scaling.
- Offline fallback.

Backend:

- Modular route structure.
- Local JSON database hardening.
- Backup/restore.
- Websocket live updates.
- Sync workers.
- Calendar sync scheduler.
- Home Assistant service.
- Weather service.
- Photos service.
- Settings service.
- Audit log.

Deployment:

- Pi install test.
- Docker test.
- Kiosk watchdog.
- Recovery screen.
- Service restart from UI.
- Update script.
- Release package.

Security:

- API keys.
- Local-only default.
- Tailscale recommended.
- No secrets committed.
- Camera privacy controls.
- Role permissions later.

---

## Final Vision

Family Hub should feel like a calm, premium, always-on family operating system:

- It tells the family what matters today.
- It keeps everyone organised.
- It controls the home.
- It shows memories when idle.
- It works locally and privately.
- It can grow into a product people would actually buy.
