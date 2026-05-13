#!/bin/bash
set -e

G="\033[32m" B="\033[34m" Y="\033[33m" W="\033[1m" X="\033[0m"
log(){ echo -e "${B}▶${X} $1"; }
ok(){ echo -e "${G}✓${X} $1"; }
warn(){ echo -e "${Y}⚠${X} $1"; }

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$INSTALL_DIR"

echo -e "\n${W}🏡 Family Hub — Raspberry Pi Installer${X}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

log "Updating system packages…"
sudo apt-get update -qq || warn "apt update failed — continuing"

log "Installing required system packages…"
sudo apt-get install -y -qq curl git python3 unclutter x11-xserver-utils chromium-browser || \
  sudo apt-get install -y -qq curl git python3 unclutter x11-xserver-utils chromium || \
  sudo apt-get install -y -qq curl git python3 || \
  warn "Some packages could not be installed — check manually"

NODE_VER=$(node -e "console.log(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_VER" -lt 20 ] 2>/dev/null; then
  log "Installing Node.js 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
ok "Node $(node --version) ready"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  log "Creating .env from template…"
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  ok ".env created — edit it with: nano $INSTALL_DIR/.env"
else
  ok ".env already exists"
fi

log "Installing API dependencies…"
npm install --prefix apps/api
ok "API deps ready"

log "Installing UI dependencies…"
npm install --prefix apps/ui
ok "UI deps ready"

log "Building UI…"
npm run build --prefix apps/ui
ok "UI built"

mkdir -p "$INSTALL_DIR/apps/api/data"
ok "Data directory ready"

chmod +x "$INSTALL_DIR/infra/kiosk-launch.sh" 2>/dev/null || true
chmod +x "$INSTALL_DIR/infra/doctor.sh" 2>/dev/null || true

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

log "Installing UI systemd service…"
sudo tee /etc/systemd/system/family-hub-ui.service > /dev/null << SVCEOF
[Unit]
Description=Family Hub UI
After=family-hub-api.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/apps/ui/dist
ExecStart=/usr/bin/python3 -m http.server 5173 --bind 0.0.0.0
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable family-hub-api family-hub-ui
sudo systemctl restart family-hub-api family-hub-ui || sudo systemctl start family-hub-api family-hub-ui
ok "Services installed and running"

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

mkdir -p "$HOME/.config/lxsession/LXDE-pi"
grep -q "xset s off" "$HOME/.config/lxsession/LXDE-pi/autostart" 2>/dev/null || cat >> "$HOME/.config/lxsession/LXDE-pi/autostart" << BEOF
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0 -root
BEOF
ok "Kiosk autostart configured"

PI_IP=$(hostname -I | awk '{print $1}')

echo -e "\n${G}${W}✓ Family Hub installed!${X}\n"
echo -e "  ${W}Dashboard:${X} http://$PI_IP:5173"
echo -e "  ${W}Setup:${X}     http://$PI_IP:3001/setup"
echo -e "  ${W}API:${X}       http://$PI_IP:3001/api/health"
echo -e "\nNext: sudo reboot\n"
