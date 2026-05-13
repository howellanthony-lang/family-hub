#!/bin/bash
KIOSK_URL="http://localhost:5173"
MAX=60; WAITED=0
echo "[Kiosk] Waiting for UI at $KIOSK_URL..."
while ! curl -sf "$KIOSK_URL" >/dev/null 2>&1; do
  sleep 2; WAITED=$((WAITED+2))
  [ $WAITED -ge $MAX ] && { echo "[Kiosk] Timeout — launching anyway"; break; }
done
echo "[Kiosk] Launching Chromium..."
chromium-browser --kiosk --no-sandbox --disable-infobars --disable-session-crashed-bubble \
  --disable-restore-session-state --noerrdialogs --disable-translate \
  --disable-features=TranslateUI --check-for-update-interval=31536000 \
  --disable-pinch --overscroll-history-navigation=0 --touch-events=enabled "$KIOSK_URL" &
CPID=$!
while true; do
  kill -0 $CPID 2>/dev/null || { echo "[Kiosk] Restarting..."; sleep 5; exec "$0"; }
  sleep 10
done
