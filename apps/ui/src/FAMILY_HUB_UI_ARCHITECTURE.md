# Family Hub UI Architecture

## Goal
Create a premium Apple Home-inspired touchscreen dashboard for Raspberry Pi.

## Main screens

### Home
- Greeting header
- Status chips
- Cameras
- Scenes
- Favorites
- Rooms
- Today summary
- Bottom dock

### Calendar
- Today view
- Upcoming events
- Month/week/day placeholders

### Automation
- Scene/routine cards
- Ambient mode settings
- Smart home shortcuts

### Family
- Chores
- Meals
- Grocery
- Notes
- Family profiles

### Photos
- Photo frame mode
- Shared albums
- Idle mode preview

### Settings
- Apple Calendar setup
- Home Assistant setup
- Theme settings
- Greeting settings
- Privacy and local-first messaging
- System status

---

## Component system

### Layout components
- AppShell
- PageContainer
- BottomDock
- SectionHeader

### Card components
- GlassCard
- StatusChip
- CameraCard
- SceneCard
- RoomCard
- TodayCard
- EventCard
- ChoreCard
- MealCard
- NoteCard

### Utility components
- AmbientBackground
- IdleOverlay
- AnimatedGradient
- LoadingState
- ErrorState

---

## Theme direction

### Colours
- White base
- Black text
- Green accents
- Orange accents
- Soft greys

### Style
- Large radius corners
- Soft shadows
- Blur/glass cards
- Calm animations
- Spacious layout
- Touch-first spacing

---

## Ambient modes

### Morning
Weather + today summary.

### Day
Calendar + tasks.

### Evening
Meals + tomorrow preview.

### Night
Clock + security + nursery.

### Idle
Photo frame mode.

---

## Technical direction

Frontend stack:
- React
- Vite
- CSS variables
- Local mock data first

Deployment:
- Chromium kiosk
- Raspberry Pi touchscreen
- Landscape-first layout

Data flow:
- Mock data initially
- Real API integration later
- Apple/iCloud sync after UI foundation
