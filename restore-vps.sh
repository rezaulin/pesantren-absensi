#!/bin/bash
# ══════════════════════════════════════════════════════════
# VPS Restore - Restore semua dari backup ke VPS baru
# Cara pakai:
#   1. Download archive dari R2:
#      aws --endpoint-url $R2_ENDPOINT s3 cp s3://pesantren-backup/vps-migration/vps-backup-XXXXXX.tar.gz .
#   2. Jalankan:
#      bash restore-vps.sh vps-backup-XXXXXX.tar.gz
# ══════════════════════════════════════════════════════════

set -e

ARCHIVE="$1"

if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
    echo "Usage: bash restore-vps.sh <archive.tar.gz>"
    echo ""
    echo "Download dari R2 dulu:"
    echo "  apt install awscli -y  # atau pip install awscli"
    echo "  # Setup ~/.aws/credentials dan ~/.r2-config"
    echo "  aws --endpoint-url \$R2_ENDPOINT s3 ls s3://pesantren-backup/vps-migration/"
    exit 1
fi

echo "═══════════════════════════════════════════"
echo "  VPS Restore"
echo "  Archive: $ARCHIVE"
echo "═══════════════════════════════════════════"

# Extract
echo "[1/8] Extract archive..."
RESTORE_DIR="/tmp/vps-restore"
rm -rf "$RESTORE_DIR"
mkdir -p "$RESTORE_DIR"
tar -xzf "$ARCHIVE" -C "$RESTORE_DIR"
BACKUP_CONTENT="$RESTORE_DIR/vps-full-backup"

# Install dependencies
echo "[2/8] Install dependencies..."
apt update -qq && apt install -y -qq nginx nodejs npm certbot python3-certbot-nginx 2>/dev/null
npm install -g pm2 2>/dev/null || true
pip install awscli 2>/dev/null || true

# Restore R2 & AWS config
echo "[3/8] Restore configs..."
if [ -f "$BACKUP_CONTENT/config/.r2-config" ]; then
    cp "$BACKUP_CONTENT/config/.r2-config" /root/.r2-config
    chmod 600 /root/.r2-config
    echo "  ✓ R2 config"
fi
if [ -d "$BACKUP_CONTENT/config/.aws" ]; then
    cp -r "$BACKUP_CONTENT/config/.aws" /root/.aws
    echo "  ✓ AWS config"
fi

# Restore SSL
echo "[4/8] Restore SSL..."
mkdir -p /etc/nginx/ssl
cp -r "$BACKUP_CONTENT/ssl/"* /etc/nginx/ssl/ 2>/dev/null && echo "  ✓ SSL certificates" || echo "  ⚠ No SSL certs"

# Restore Nginx
echo "[5/8] Restore Nginx..."
mkdir -p /etc/nginx/sites-enabled
cp -r "$BACKUP_CONTENT/nginx/"* /etc/nginx/sites-enabled/ 2>/dev/null && echo "  ✓ Nginx configs" || echo "  ⚠ No Nginx configs"

# Restore app & data
echo "[6/8] Restore app & data..."
# Clone repo
if [ ! -d "/root/pesantren-absensi" ]; then
    git clone https://github.com/rezaulin/vps-deploy.git /root/pesantren-absensi
fi
cd /root/pesantren-absensi
npm install --production

# Restore data.json per klien
for datafile in "$BACKUP_CONTENT/data/"*.json; do
    if [ -f "$datafile" ]; then
        NAME=$(basename "$datafile" .json)
        if [ "$NAME" = "main" ]; then
            cp "$datafile" /root/pesantren-absensi/data.json
            echo "  ✓ main (data.json)"
        else
            # Need to figure out client directory from PM2 or nginx config
            CLIENT_DIR=$(grep -r "proxy_pass.*127.0.0.1" /etc/nginx/sites-enabled/ 2>/dev/null | head -1 | sed 's/.*server_name\s*//' | head -1)
            if [ -d "/var/www/$NAME" ]; then
                cp "$datafile" "/var/www/$NAME/data.json"
                echo "  ✓ $NAME"
            fi
        fi
    fi
done

# Restore PM2
echo "[7/8] Restore PM2..."
if [ -f "$BACKUP_CONTENT/pm2/dump.pm2" ]; then
    cp "$BACKUP_CONTENT/pm2/dump.pm2" /root/.pm2/dump.pm2 2>/dev/null || true
    pm2 resurrect 2>/dev/null || true
    echo "  ✓ PM2 processes"
fi

# Restore crontab
echo "[8/8] Restore crontab..."
if [ -f "$BACKUP_CONTENT/config/crontab.txt" ]; then
    crontab "$BACKUP_CONTENT/config/crontab.txt"
    echo "  ✓ Crontab"
fi

# Restart services
echo ""
echo "Restarting services..."
nginx -t && systemctl restart nginx
pm2 restart all 2>/dev/null || true

# Cleanup
rm -rf "$RESTORE_DIR"

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Restore selesai!"
echo "═══════════════════════════════════════════"
echo ""
echo "  Checklist:"
echo "  □ Cek: pm2 list"
echo "  □ Cek: nginx -t"
echo "  □ Cek: curl https://domain-klien"
echo "  □ Update DNS A Record ke IP baru VPS"
echo "  □ Ganti IP di deploy-client.sh kalau perlu"
echo ""
