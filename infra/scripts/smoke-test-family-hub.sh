#!/usr/bin/env bash
BASE=${API_BASE:-http://localhost:3001}
PASS=0; FAIL=0

check() {
  local label=$1 url=$2 expected=$3
  body=$(curl -sf "$url" 2>/dev/null) || { echo "  ✗  $label — no response from $url"; ((FAIL++)); return; }
  if echo "$body" | grep -q "$expected"; then
    echo "  ✓  $label";  ((PASS++))
  else
    echo "  ✗  $label — expected '$expected' not found in response"
    echo "     Response: ${body:0:120}"
    ((FAIL++))
  fi
}

echo "=== Family Hub v2.1 — Smoke Test ($BASE) ==="

check "GET /api/health"              "$BASE/api/health"              '"ok":true'
check "GET /api/system/readiness"    "$BASE/api/system/readiness"    '"version"'
check "GET /api/calendar/config"     "$BASE/api/calendar/config"     '"apple"'
check "GET /api/calendar/events"     "$BASE/api/calendar/events"     '"events"'
check "GET /api/weather"             "$BASE/api/weather"             '"location"'
check "GET /api/photos"              "$BASE/api/photos"              '"photos"'
check "GET /api/homekit/summary"     "$BASE/api/homekit/summary"     '"status"'
check "GET /api/homekit/devices"     "$BASE/api/homekit/devices"     '"devices"'
check "GET /api/tasks"               "$BASE/api/tasks"               '\['
check "GET /api/meals/week"          "$BASE/api/meals/week"          '"monday"'

echo ""
echo "=== Result: ${PASS} passed · ${FAIL} failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
