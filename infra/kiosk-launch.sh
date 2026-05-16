#!/bin/bash
set -e

URL="http://localhost:5173"
LOG="$HOME/family-hub-kiosk.log"

export DISPLAY=${DISPLAY:-:0}
export XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}

while ! curl -fsS "$URL" >/dev/null 2>&1; do
  echo "Waiting for Family Hub UI at $URL" >> "$LOG"
  sleep 3
done

pkill -f "chromium.*localhost:5173" >/dev/null 2>&1 || true
pkill -f "chromium-browser.*localhost:5173" >/dev/null 2>&1 || true

if command -v chromium-browser >/dev/null 2>&1; then
  BROWSER="chromium-browser"
elif command -v chromium >/dev/null 2>&1; then
  BROWSER="chromium"
else
  echo "Chromium is not installed" >> "$LOG"
  exit 1
fi

exec "$BROWSER" \
  --kiosk "$URL" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  --start-fullscreen
