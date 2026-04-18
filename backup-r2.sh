#!/bin/bash
# ══════════════════════════════════════════════════════════
# Backup Semua Klien ke Cloudflare R2
# Jalankan via crontab: 0 */6 * * * /root/pesantren-absensi/backup-r2.sh
# ══════════════════════════════════════════════════════════

# Load R2 config
if [ -f /root/.r2-config ]; then
    source /root/.r2-config
else
    echo "Error: /root/.r2-config tidak ditemukan!"
    echo "Buat file dengan isi:"
    echo "  R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com"
    echo "  R2_ACCESS_KEY=xxx"
    echo "  R2_SECRET_KEY=xxx"
    echo "  R2_BUCKET=pesantren-backup"
    exit 1
fi

BUCKET="s3://${R2_BUCKET}"
ENDPOINT="$R2_ENDPOINT"
LOCAL_DIR="/root/backups"
LOG_FILE="/root/backup-r2.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

mkdir -p "$LOCAL_DIR"

# 1. Backup lokal dulu (semua klien)
for dir in /var/www/absensi-* /var/www/pesantren-*; do
    if [ -f "$dir/data.json" ]; then
        NAME=$(basename "$dir")
        TIMESTAMP=$(date '+%Y%m%d_%H%M')
        cp "$dir/data.json" "$LOCAL_DIR/${NAME}_${TIMESTAMP}.json"
    fi
done

# Backup juga yang utama
if [ -f "/root/pesantren-absensi/data.json" ]; then
    TIMESTAMP=$(date '+%Y%m%d_%H%M')
    cp "/root/pesantren-absensi/data.json" "$LOCAL_DIR/main_${TIMESTAMP}.json"
fi

# 2. Upload ke R2
UPLOAD_COUNT=0
ERROR_COUNT=0
for file in "$LOCAL_DIR"/*.json; do
    if [ -f "$file" ]; then
        FILENAME=$(basename "$file")
        if aws --endpoint-url "$ENDPOINT" s3 cp "$file" "$BUCKET/backups/$FILENAME" --quiet 2>/dev/null; then
            UPLOAD_COUNT=$((UPLOAD_COUNT + 1))
        else
            ERROR_COUNT=$((ERROR_COUNT + 1))
            log "ERROR: Gagal upload $FILENAME"
        fi
    fi
done

log "R2 backup selesai: $UPLOAD_COUNT file uploaded, $ERROR_COUNT errors"

# 3. Cleanup lokal (retention 7 hari)
DELETED=$(find "$LOCAL_DIR" -name "*.json" -mtime +7 -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    log "Cleanup lokal: hapus $DELETED file lama"
fi

# 4. Cleanup R2 (retention 30 hari)
RETENTION_DATE=$(date -d '30 days ago' '+%Y-%m-%d' 2>/dev/null || date -v-30d '+%Y-%m-%d' 2>/dev/null)
if [ -n "$RETENTION_DATE" ]; then
    # List & hapus file lama di R2
    OLD_FILES=$(aws --endpoint-url "$ENDPOINT" s3 ls "$BUCKET/backups/" 2>/dev/null | awk '{print $4}' | while read f; do
        # Extract date from filename: NAME_YYYYMMDD_HHMM.json
        FILE_DATE=$(echo "$f" | grep -oP '\d{8}' | head -1)
        if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" \< "${RETENTION_DATE//-/}" ]; then
            echo "$f"
        fi
    done)
    
    if [ -n "$OLD_FILES" ]; then
        echo "$OLD_FILES" | while read f; do
            aws --endpoint-url "$ENDPOINT" s3 rm "$BUCKET/backups/$f" --quiet 2>/dev/null
        done
        DELETED_R2=$(echo "$OLD_FILES" | wc -l)
        log "Cleanup R2: hapus $DELETED_R2 file lama"
    fi
fi

echo "Backup R2: $UPLOAD_COUNT uploaded, $ERROR_COUNT errors"
