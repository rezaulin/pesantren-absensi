#!/bin/bash
# ══════════════════════════════════════════════════════════
# Deploy Script - Tambah Klien Baru di VPS yang sama
# Cara pakai: bash deploy-client.sh <nama-klien> <port> <domain>
# Contoh:     bash deploy-client.sh pondok-alhikmah 3001 absensi.alhikmah.sch.id
# ══════════════════════════════════════════════════════════

set -e

CLIENT_NAME="$1"
PORT="$2"
DOMAIN="$3"

if [ -z "$CLIENT_NAME" ] || [ -z "$PORT" ] || [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <nama-klien> <port> <domain>"
    echo "Contoh: $0 pondok-alhikmah 3001 absensi.alhikmah.sch.id"
    exit 1
fi

APP_DIR="/var/www/${CLIENT_NAME}"
REPO_URL="https://github.com/rezaulin/vps-deploy.git"
JWT_SECRET=$(openssl rand -hex 32)

echo "═══════════════════════════════════════════"
echo "  Deploy: ${CLIENT_NAME}"
echo "  Port:   ${PORT}"
echo "  Domain: ${DOMAIN}"
echo "═══════════════════════════════════════════"

# 1. Clone repo
echo "[1/5] Clone repo..."
if [ -d "$APP_DIR" ]; then
    echo "  Folder sudah ada, update..."
    cd "$APP_DIR"
    git pull
else
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 2. Install dependencies
echo "[2/5] Install dependencies..."
npm install --production

# 3. Init data.json (kosong / fresh)
if [ ! -f "$APP_DIR/data.json" ]; then
    echo "[3/5] Init database baru..."
    cat > "$APP_DIR/data.json" << 'EOF'
{"users":[],"kamar":[],"santri":[],"absensi":[],"pengumuman":[],"kegiatan":[],"settings":{"app_name":"Pesantren Absensi","logo":""}}
EOF
else
    echo "[3/5] Database sudah ada, skip..."
fi

# 4. Setup PM2
echo "[4/5] Setup PM2..."
mkdir -p /var/log/pm2

# Cek apakah sudah ada di ecosystem
if pm2 describe "absensi-${CLIENT_NAME}" >/dev/null 2>&1; then
    echo "  PM2 app sudah ada, restart..."
    pm2 restart "absensi-${CLIENT_NAME}"
else
    # Tambah ke PM2 dengan env variables
    cd "$APP_DIR"
    PORT=$PORT JWT_SECRET=$JWT_SECRET pm2 start server.js \
        --name "absensi-${CLIENT_NAME}" \
        --log "/var/log/pm2/${CLIENT_NAME}.log"
fi

pm2 save

# 5. Setup Nginx
echo "[5/5] Setup Nginx..."
NGINX_CONF="/etc/nginx/sites-enabled/absensi-${CLIENT_NAME}"

cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    listen 443 ssl;
    server_name ${DOMAIN};

    # SSL - ganti dengan path certificate kamu
    ssl_certificate /etc/nginx/ssl/absensi-${CLIENT_NAME}.crt;
    ssl_certificate_key /etc/nginx/ssl/absensi-${CLIENT_NAME}.key;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

nginx -t && systemctl reload nginx

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Deploy selesai!"
echo "═══════════════════════════════════════════"
echo ""
echo "  URL:      https://${DOMAIN}"
echo "  Port:     ${PORT}"
echo "  Path:     ${APP_DIR}"
echo "  JWT:      ${JWT_SECRET}"
echo "  Login:    admin / admin123"
echo ""
echo "  ⚠️  TODO:"
echo "  1. Ganti password admin!"
echo "  2. Setup SSL certificate di Cloudflare"
echo "  3. Add DNS record untuk ${DOMAIN}"
echo ""
echo "  Simpan JWT_SECRET ini (kalau butuh):"
echo "  ${JWT_SECRET}"
echo ""
