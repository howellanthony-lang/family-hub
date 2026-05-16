#!/usr/bin/env bash
cd "$(dirname "$0")/../.."

PASS=0; FAIL=0; WARN=0
ok()   { echo "  ✓  $1"; ((PASS++)); }
fail() { echo "  ✗  $1"; ((FAIL++)); }
warn() { echo "  !  $1"; ((WARN++)); }

echo "=== Family Hub v2.1 — Doctor ==="

# Systemd services
systemctl is-active --quiet family-hub-api  && ok  "family-hub-api running"   || fail "family-hub-api NOT running — run: sudo systemctl start family-hub-api"
systemctl is-active --quiet family-hub-ui   && ok  "family-hub-ui running"    || warn "family-hub-ui not running (optional if serving from nginx)"

# API health
curl -sf http://localhost:3001/api/health > /dev/null && ok "API /health responds" || fail "API /health not responding"

# .env checks
ENV=/home/mando3/family-hub/.env
[ -f "$ENV" ] && ok ".env file exists" || fail ".env missing — copy .env.example"

check_env() {
  local key=$1 label=$2 required=$3
  val=$(grep -s "^${key}=" "$ENV" | cut -d= -f2-)
  if [ -n "$val" ]; then ok "$label set";
  elif [ "$required" = "required" ]; then fail "$label NOT SET (required)";
  else warn "$label not set (optional)"; fi
}

check_env PORT              "PORT"                      optional
check_env APPLE_USERNAME    "APPLE_USERNAME"            optional
check_env APPLE_PASSWORD    "APPLE_PASSWORD"            optional
check_env APPLE_CALENDAR_URL "APPLE_CALENDAR_URL"       optional
check_env HOME_ASSISTANT_URL "HOME_ASSISTANT_URL"       optional
check_env HOME_ASSISTANT_TOKEN "HOME_ASSISTANT_TOKEN"   optional
check_env WEATHER_LOCATION  "WEATHER_LOCATION"          optional

# Node version
node_ver=$(node --version 2>/dev/null | grep -oP '\d+' | head -1)
[ "${node_ver:-0}" -ge 20 ] && ok "Node.js ≥ 20 ($(node --version))" || warn "Node.js < 20 — upgrade recommended"

# Disk
avail=$(df / --output=avail -BM | tail -1 | tr -d 'M ')
[ "$avail" -gt 500 ] && ok "Disk: ${avail}MB free" || warn "Low disk: ${avail}MB free"

echo ""
echo "=== Result: ${PASS} ok · ${WARN} warnings · ${FAIL} failures ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
