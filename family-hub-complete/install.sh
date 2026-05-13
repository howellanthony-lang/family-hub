#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Family Hub — One-Command Raspberry Pi Installer v1.0
#  Usage: bash install.sh
# ═══════════════════════════════════════════════════════════════
set -e
G="\033[32m" B="\033[34m" Y="\033[33m" R="\033[31m" W="\033[1m" X="\033[0m"
log(){ echo -e "${B}▶${X} $1"; }
ok(){ echo -e "${G}✓${X} $1"; }
warn(){ echo -e "${Y}⚠${X} $1"; }
fail(){ echo -e "${R}✗${X} $1"; exit 1; }

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$INSTALL_DIR"

echo -e "\n${W}🏡 Family Hub — Raspberry Pi Installer${X}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

# ── Check OS ──────────────────────────────────────────────────
if ! command -v apt-get &>/dev/null; then
  warn "Not a Debian-based system. Some steps may need manual adjustment."
fi

# ── System packages ───────────────────────────────────────────
log "Updating system packages…"
sudo apt-get update -qq 2>/dev/null || warn "apt update failed — continuing"

log "Installing required system packages…"
sudo apt-get install -y -qq curl git python3 unclutter chromium-browser 2>/dev/null || \
  sudo apt-get install -y -qq curl git python3 2>/dev/null || \
  warn "Some packages could not be installed — check manually"

# ── Node.js v20 ───────────────────────────────────────────────
NODE_VER=$(node -e "console.log(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_VER" -lt 20 ] 2>/dev/null; then
  log "Installing Node.js 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
  sudo apt-get install -y nodejs 2>/dev/null
fi
ok "Node $(node --version) ready"

# ── .env setup ────────────────────────────────────────────────
if [ ! -f "$INSTALL_DIR/.env" ]; then
  log "Creating .env from template…"
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  ok ".env created — edit it with: nano $INSTALL_DIR/.env"
else
  ok ".env already exists"
fi

# ── npm dependencies ──────────────────────────────────────────
log "Installing API dependencies…"
cd "$INSTALL_DIR/apps/api" && npm install --silent 2>/dev/null || true
ok "API deps ready"

log "Installing UI dependencies…"
cd "$INSTALL_DIR/apps/ui" && npm install --silent 2>/dev/null || true
ok "UI deps ready"

# ── Build UI ──────────────────────────────────────────────────
log "Building UI…"
cd "$INSTALL_DIR/apps/ui"
npm run build --silent 2>/dev/null || { warn "UI build failed — run 'npm run build --prefix apps/ui' manually"; }
ok "UI built"

# ── Data directory ────────────────────────────────────────────
mkdir -p "$INSTALL_DIR/apps/api/data"
ok "Data directory ready"

# ── Systemd: API service ──────────────────────────────────────
log "Installing API systemd service…"
sudo tee /etc/systemd/system/family-hub-api.service > /dev/null << SVCEOF
[Unit]
Description=Family Hub API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node --env-file=$INSTALL_DIR/.env $INSTALL_DIR/apps/api/server.mjs
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

# ── Systemd: UI service ───────────────────────────────────────
log "Installing UI systemd service…"
sudo tee /etc/systemd/system/family-hub-ui.service > /dev/null << SVCEOF
[Unit]
Description=Family Hub UI
After=family-hub-api.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/apps/ui/dist
ExecStart=/usr/bin/python3 -m http.server 5173
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable family-hub-api family-hub-ui
sudo systemctl restart family-hub-api family-hub-ui 2>/dev/null || sudo systemctl start family-hub-api family-hub-ui
ok "Services installed and running"

# ── Kiosk autostart ───────────────────────────────────────────
log "Configuring kiosk autostart…"
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/family-hub-kiosk.desktop" << KEOF
[Desktop Entry]
Type=Application
Name=Family Hub Kiosk
Exec=bash $INSTALL_DIR/infra/kiosk-launch.sh
Hidden=false
X-GNOME-Autostart-enabled=true
KEOF

# Disable screen blanking
mkdir -p "$HOME/.config/lxsession/LXDE-pi"
grep -q "xset s off" "$HOME/.config/lxsession/LXDE-pi/autostart" 2>/dev/null || cat >> "$HOME/.config/lxsession/LXDE-pi/autostart" << BEOF
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0 -root
BEOF
ok "Kiosk autostart configured"

# ── Get Pi's IP ───────────────────────────────────────────────
PI_IP=$(hostname -I | awk '{print $1}')

# ── Done ──────────────────────────────────────────────────────
echo -e "\n${G}${W}✓ Family Hub installed!${X}\n"
echo -e "  ${W}Your Pi's IP:${X}    ${B}$PI_IP${X}"
echo -e "  ${W}Dashboard:${X}       ${B}http://$PI_IP:5173${X}"
echo -e "  ${W}API:${X}             ${B}http://$PI_IP:3001${X}"
echo -e ""
echo -e "  ${W}Next steps:${X}"
echo -e "  1. Edit config:    ${B}nano $INSTALL_DIR/.env${X}"
echo -e "  2. Check status:   ${B}systemctl status family-hub-api${X}"
echo -e "  3. View logs:      ${B}journalctl -u family-hub-api -f${X}"
echo -e "  4. Reboot for kiosk: ${B}sudo reboot${X}"
echo -e ""
echo -e "  ${Y}The setup wizard will run automatically on first boot.${X}\n"
