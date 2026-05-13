#!/bin/bash
set +e

echo "🏡 Family Hub Doctor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "\nUser: $(whoami)"
echo "Host: $(hostname)"
echo "IP: $(hostname -I | awk '{print $1}')"
echo "Node: $(node --version 2>/dev/null || echo 'not installed')"
echo "NPM: $(npm --version 2>/dev/null || echo 'not installed')"

echo "\nChecking folders..."
[ -d "$HOME/family-hub" ] && echo "✓ ~/family-hub exists" || echo "✗ ~/family-hub missing"
[ -f "$HOME/family-hub/apps/ui/dist/index.html" ] && echo "✓ UI build exists" || echo "✗ UI build missing"
[ -f "$HOME/family-hub/apps/api/server.mjs" ] && echo "✓ API server exists" || echo "✗ API server missing"
[ -f "$HOME/family-hub/infra/kiosk-launch.sh" ] && echo "✓ Kiosk launcher exists" || echo "✗ Kiosk launcher missing"

echo "\nChecking services..."
systemctl is-active --quiet family-hub-api && echo "✓ API service running" || echo "✗ API service not running"
systemctl is-active --quiet family-hub-ui && echo "✓ UI service running" || echo "✗ UI service not running"

echo "\nChecking local endpoints..."
curl -fsS http://localhost:3001/api/health >/dev/null && echo "✓ API health works" || echo "✗ API health failed"
curl -fsS http://localhost:5173 >/dev/null && echo "✓ UI page works" || echo "✗ UI page failed"

echo "\nUseful commands:"
echo "  sudo systemctl restart family-hub-api family-hub-ui"
echo "  journalctl -u family-hub-api -n 50 --no-pager"
echo "  journalctl -u family-hub-ui -n 50 --no-pager"
echo "  bash ~/family-hub/infra/kiosk-launch.sh"
