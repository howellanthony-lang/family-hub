#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../.."

echo "=== Family Hub v2.1 — Update ==="

echo "→ Pulling latest code…"
git pull origin main

echo "→ Installing API dependencies…"
npm install --prefix apps/api

echo "→ Installing UI dependencies…"
npm install --prefix apps/ui

echo "→ Building UI…"
npm run build --prefix apps/ui

echo "→ Reloading systemd and restarting services…"
sudo systemctl daemon-reload
sudo systemctl restart family-hub-api family-hub-ui

echo "→ Waiting for API to start…"
sleep 4

echo "→ Health check…"
curl -sf http://localhost:3001/api/health && echo "" || { echo "API health check FAILED"; exit 1; }

echo "=== Update complete ==="
