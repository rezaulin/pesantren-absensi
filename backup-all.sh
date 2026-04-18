#!/bin/bash
# ══════════════════════════════════════════════════════════
# Backup Semua Klien - Auto backup data.json setiap klien
# Jalankan via crontab: 0 */6 * * * /root/pesantren-absensi/backup-all.sh
# ══════════════════════════════════════════════════════════

BACKUP_DIR="/root/backups"
RETENTION_DAYS=7
LOG_FILE="/root/backup-all.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

mkdir -p "$BACKUP_DIR"

# Scan semua folder klien di /var/www/
for dir in /var/www/*/; do
    if [ -f "$dir/data.json" ]; then
        NAME=$(basename "$dir")
        TIMESTAMP=$(date '+%Y%m%d_%H%M')
        DEST="$BACKUP_DIR/${NAME}_${TIMESTAMP}.json"

        cp "$dir/data.json" "$DEST"
        log "OK: $NAME → $DEST"
    fi
done

# Scan juga yang di /root/pesantren-absensi (utama)
if [ -f "/root/pesantren-absensi/data.json" ]; then
    TIMESTAMP=$(date '+%Y%m%d_%H%M')
    cp "/root/pesantren-absensi/data.json" "$BACKUP_DIR/main_${TIMESTAMP}.json"
    log "OK: main → main_${TIMESTAMP}.json"
fi

# Hapus backup lama (> retention days)
DELETED=$(find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    log "Cleanup: hapus $DELETED file backup lama"
fi

log "Backup selesai"
