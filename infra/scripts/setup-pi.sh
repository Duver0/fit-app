#!/bin/bash
set -euo pipefail

echo "=== fit-app: Raspberry Pi Setup ==="

echo "[1/6] Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "[2/6] Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

echo "[3/6] Installing Docker Compose..."
sudo apt install -y docker-compose-plugin

echo "[4/6] Installing tools..."
sudo apt install -y nginx certbot python3-certbot-nginx jq

echo "[5/6] Setting up DuckDNS..."
sudo tee /usr/local/bin/duckdns-update.sh > /dev/null << 'DUCKSCRIPT'
#!/bin/bash
DOMAIN="${1:-fitapp}"
TOKEN="${2:-}"
if [ -z "$TOKEN" ]; then
    echo "Usage: $0 <domain> <token>"
    echo "Or set DUCKDNS_TOKEN env var"
    exit 1
fi
curl -s "https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip=" > /dev/null
echo "DuckDNS updated: $(date)"
DUCKSCRIPT
sudo chmod +x /usr/local/bin/duckdns-update.sh

echo "[6/6] Creating directory structure..."
sudo mkdir -p /srv/fit-app/{nginx/{ssl,conf.d},scripts,backups,logs,uploads}

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Logout/login to apply Docker group: newgrp docker"
echo "  2. Configure DuckDNS: sudo crontab -e"
echo "     Add: */5 * * * * /usr/local/bin/duckdns-update.sh fitapp YOUR_DUCKDNS_TOKEN"
echo "  3. Create .env file: nano /srv/fit-app/.env"
echo "  4. Sync infra files: rsync -avz infra/ pi@<IP>:/srv/fit-app/"
echo "  5. Run: cd /srv/fit-app && docker compose up -d"
