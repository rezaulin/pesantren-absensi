#!/bin/bash
# ══════════════════════════════════════════════════════════
# Full VPS Backup - Backup semua konfigurasi + data ke R2
# Jalankan sebelum migrasi VPS
# ══════════════════════════════════════════════════════════

set -e

# Load R2 config
source /root/.r2-config
R2_ENDPOINT="$R2_ENDPOINT"
BACKUP_DIR="/tmp/vps-full-backup"
TIMESTAMP=$(date '+%Y%m%d_%H%M')
ARCHIVE="vps-backup-${TIMESTAMP}.tar.gz"

echo "═══════════════════════════════════════════"
echo "  Full VPS Backup"
echo "  Timestamp: $TIMESTAMP"
echo "═══════════════════════════════════════════"

# Cleanup
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"/{nginx,ssl,pm2,app,config,data}

# 1. Nginx configs
echo "[1/7] Backup Nginx..."
cp -r /etc/nginx/sites-enabled/* "$BACKUP_DIR/nginx/" 2>/dev/null || true
cp /etc/nginx/nginx.conf "$BACKUP_DIR/nginx/" 2>/dev/null || true

# 2. SSL certificates
echo "[2/7] Backup SSL..."
cp -r /etc/nginx/ssl/* "$BACKUP_DIR/ssl/" 2>/dev/null || true

# 3. PM2 ecosystem & processes
echo "[3/7] Backup PM2..."
pm2 save --force 2>/dev/null || true
cp -r /root/.pm2/* "$BACKUP_DIR/pm2/" 2>/dev/null || true

# 4. App data (semua data.json dari semua klien)
echo "[4/7] Backup data klien..."
for dir in /var/www/*/; do
    if [ -f "$dir/data.json" ]; then
        NAME=$(basename "$dir")
        cp "$dir/data.json" "$BACKUP_DIR/data/${NAME}.json"
        echo "  ✓ $NAME"
    fi
done
# Backup juga yang utama
if [ -f "/root/pesantren-absensi/data.json" ]; then
    cp "/root/pesantren-absensi/data.json" "$BACKUP_DIR/data/main.json"
    echo "  ✓ main"
fi

# 5. Config files
echo "[5/7] Backup configs..."
cp /root/.r2-config "$BACKUP_DIR/config/" 2>/dev/null || true
cp -r /root/.aws "$BACKUP_DIR/config/" 2>/dev/null || true
cp /root/pesantren-absensi/DNS-TEMPLATE.md "$BACKUP_DIR/config/" 2>/dev/null || true

# 6. Cron jobs
echo "[6/7] Backup crontab..."
crontab -l > "$BACKUP_DIR/config/crontab.txt" 2>/dev/null || true

# 7. Compress
echo "[7/7] Compressing..."
cd /tmp
tar -czf "$ARCHIVE" -C /tmp vps-full-backup/

ARCHIVE_SIZE=$(du -h "/tmp/$ARCHIVE" | cut -f1)
echo ""
echo "Archive: /tmp/$ARCHIVE ($ARCHIVE_SIZE)"

# Upload to R2
echo ""
echo "Uploading to R2..."
aws --endpoint-url "$R2_ENDPOINT" s3 cp "/tmp/$ARCHIVE" "s3://${R2_BUCKET}/vps-migration/$ARCHIVE" 2>/dev/null

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Backup selesai!"
echo "═══════════════════════════════════════════"
echo ""
echo "  File: /tmp/$ARCHIVE"
echo "  R2:   s3://${R2_BUCKET}/vps-migration/$ARCHIVE"
echo ""
echo "  Di VPS baru:"
echo "  1. Download dari R2"
echo "  2. bash restore-vps.sh $ARCHIVE"
echo ""

# Cleanup temp
rm -rf "$BACKUP_DIR"
