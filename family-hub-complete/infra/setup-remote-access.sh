#!/bin/bash
set -e
G="\033[32m" B="\033[34m" W="\033[1m" X="\033[0m"

echo -e "\n${W}🌐 Family Hub — Remote Access Setup${X}\n"

# Install Tailscale
if ! command -v tailscale &>/dev/null; then
  echo -e "${B}▶${X} Installing Tailscale..."
  curl -fsSL https://tailscale.com/install.sh | sh
fi

echo -e "${B}▶${X} Starting Tailscale..."
sudo tailscale up --accept-routes

TS_IP=$(tailscale ip -4 2>/dev/null || echo "unknown")
NEW_KEY=$(node -e "const{randomBytes}=require('crypto');console.log(randomBytes(32).toString('hex'))" 2>/dev/null || python3 -c "import secrets;print(secrets.token_hex(32))")

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
if [ -f "$ENV_FILE" ] && ! grep -q "^API_KEYS=." "$ENV_FILE"; then
  sed -i "s/^API_KEYS=$/API_KEYS=$NEW_KEY/" "$ENV_FILE"
  sudo systemctl restart family-hub-api 2>/dev/null || true
fi

echo -e "\n${G}${W}✓ Remote access ready!${X}"
echo -e "  Tailscale IP: ${B}$TS_IP${X}"
echo -e "  API key:      ${B}$NEW_KEY${X}"
echo -e "  Remote URL:   ${B}http://$TS_IP:3001${X}"
echo -e "  Dashboard:    ${B}http://$TS_IP:5173${X}\n"
echo -e "  Test: ${B}curl -H 'X-API-Key: $NEW_KEY' http://$TS_IP:3001/api/health${X}\n"
