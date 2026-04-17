#!/bin/bash
# Auto backup data.json ke GitHub (branch: backup-data)
# Jalankan via crontab: 0 * * * * /root/pesantren-absensi/backup.sh

REPO_DIR="/root/pesantren-absensi"
BACKUP_DIR="/tmp/pesantren-backup"
BRANCH="backup-data"
LOG_FILE="/root/pesantren-absensi/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Pastikan data.json ada
if [ ! -f "$REPO_DIR/data.json" ]; then
    log "ERROR: data.json tidak ditemukan"
    exit 1
fi

# Dapatkan origin URL
ORIGIN_URL=$(cd "$REPO_DIR" && git remote get-url origin)

# Setup backup dir (sekali saja)
if [ ! -d "$BACKUP_DIR/.git" ]; then
    rm -rf "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cd "$BACKUP_DIR"
    git init
    git remote add origin "$ORIGIN_URL"
    git checkout -b "$BRANCH"
    log "Backup repo initialized"
else
    cd "$BACKUP_DIR"
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
fi

# Simpan hash data.json lama (jika ada)
OLD_HASH=""
if [ -f "./data.json" ]; then
    OLD_HASH=$(sha256sum ./data.json | cut -d' ' -f1)
fi

# Copy data.json baru
cp "$REPO_DIR/data.json" "./data.json"
NEW_HASH=$(sha256sum ./data.json | cut -d' ' -f1)

# Cek apakah ada perubahan
if [ "$OLD_HASH" = "$NEW_HASH" ] && git rev-parse HEAD >/dev/null 2>&1; then
    # Tidak ada perubahan
    exit 0
fi

# Commit
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
git add data.json
git commit -m "backup $TIMESTAMP" --quiet

# Push
git push "$ORIGIN_URL" "$BRANCH" --force --quiet 2>/dev/null

log "Backup sukses: $TIMESTAMP"
