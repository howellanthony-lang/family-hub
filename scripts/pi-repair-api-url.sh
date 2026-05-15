#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASS_COUNT=0
FAIL_COUNT=0

info() { printf '\n== %s ==\n' "$1"; }
pass() { PASS_COUNT=$((PASS_COUNT + 1)); printf 'PASS: %s\n' "$1"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); printf 'FAIL: %s\n' "$1"; }

run_check() {
  local label="$1"
  shift
  info "$label"
  if "$@"; then
    pass "$label"
  else
    fail "$label"
    return 1
  fi
}

run_optional_check() {
  local label="$1"
  shift
  info "$label"
  if "$@"; then
    pass "$label"
  else
    fail "$label"
  fi
}

detect_host() {
  local hostname_value ip_value
  hostname_value="$(hostname 2>/dev/null || printf 'unknown')"
  ip_value="$(hostname -I 2>/dev/null | awk '{print $1}')"
  printf 'Host: %s\n' "$hostname_value"
  if [ -n "$ip_value" ]; then
    printf 'Detected URL: http://%s:5173\n' "$ip_value"
    printf 'Detected API: http://%s:3001\n' "$ip_value"
  fi
}

check_source_api_helper() {
  test -f apps/ui/src/services/apiBase.js
  grep -R "from './services/apiBase'\|from '../services/apiBase'" -n apps/ui/src >/dev/null
  ! grep -R "fetch(['\"]\/api" -n apps/ui/src --exclude-dir=node_modules
}

build_ui() {
  npm install --prefix apps/api
  npm install --prefix apps/ui
  npm run build:ui
}

check_api_syntax() {
  node --check apps/api/server.mjs
}

check_built_assets() {
  test -d apps/ui/dist/assets
  ! grep -R "fetch(['\"]\/api" -n apps/ui/dist/assets
  grep -R "3001\|hostname\|API unreachable" -n apps/ui/dist/assets >/dev/null
}

restart_services() {
  sudo systemctl restart family-hub-api family-hub-ui
  sleep 2
}

check_services() {
  systemctl status family-hub-api family-hub-ui shairport-sync --no-pager --lines=0
}

check_homeassistant_container() {
  if ! command -v docker >/dev/null 2>&1; then
    printf 'Docker is not installed or not on PATH.\n'
    return 1
  fi
  docker ps --filter name=homeassistant --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
}

curl_json() {
  local url="$1"
  local tmp
  tmp="$(mktemp)"
  if curl -fsS --max-time 10 "$url" -o "$tmp"; then
    node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('Valid JSON from ${url}');" "$tmp"
    rm -f "$tmp"
    return 0
  fi
  rm -f "$tmp"
  return 1
}

check_health() {
  curl_json "http://localhost:3001/api/health"
}

check_dashboard() {
  curl_json "http://localhost:3001/api/dashboard"
}

main() {
  info "Family Hub API URL Repair"
  detect_host
  run_check "source uses shared API helper" check_source_api_helper
  run_check "npm run build:ui" build_ui
  run_check "node --check apps/api/server.mjs" check_api_syntax
  run_check "built assets use dynamic API URL" check_built_assets
  run_check "restart family-hub-api family-hub-ui" restart_services
  run_optional_check "systemctl status family-hub-api family-hub-ui shairport-sync" check_services
  run_optional_check "docker ps --filter name=homeassistant" check_homeassistant_container
  run_optional_check "curl http://localhost:3001/api/health" check_health
  run_optional_check "curl http://localhost:3001/api/dashboard" check_dashboard

  info "Summary"
  printf 'PASS: %s\nFAIL: %s\n' "$PASS_COUNT" "$FAIL_COUNT"
  [ "$FAIL_COUNT" -eq 0 ]
}

main "$@"
