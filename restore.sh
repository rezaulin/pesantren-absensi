#!/bin/bash
# ══════════════════════════════════════════════════════════
# Restore Script - Restore data.json klien
# Cara pakai:
#   bash restore.sh list                          → Lihat semua klien & backup
#   bash restore.sh <nama-klien>                  → Restore backup terbaru
#   bash restore.sh <nama-klien> <timestamp>      → Restore backup tertentu
# ══════════════════════════════════════════════════════════

BACKUP_DIR="/root/backups"

# ── Warna ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── List semua klien & backup ──
if [ "$1" = "list" ] || [ -z "$1" ]; then
    echo ""
    echo "═══════════════════════════════════════════"
    echo "  Daftar Backup Klien"
    echo "═══════════════════════════════════════════"
    echo ""

    # Scan folder klien di /var/www/
    FOUND=0
    for dir in /var/www/absensi-* /var/www/pesantren-*; do
        if [ -d "$dir" ]; then
            NAME=$(basename "$dir")
            # Cari backup terbaru
            LATEST=$(ls -t "$BACKUP_DIR/${NAME}_"*.json 2>/dev/null | head -1)
            if [ -n "$LATEST" ]; then
                LATEST_TIME=$(basename "$LATEST" | sed "s/${NAME}_//;s/\.json//")
                SIZE=$(du -h "$LATEST" | cut -f1)
                echo -e "  ${GREEN}●${NC} $NAME"
                echo -e "    Backup terbaru: ${YELLOW}$LATEST_TIME${NC} ($SIZE)"
                echo -e "    Path: $dir"
                echo ""
                FOUND=$((FOUND + 1))
            else
                echo -e "  ${RED}●${NC} $NAME"
                echo -e "    ${RED}Belum ada backup!${NC}"
                echo ""
            fi
        fi
    done

    # Cek juga yang utama
    if [ -f "/root/pesantren-absensi/data.json" ]; then
        LATEST=$(ls -t "$BACKUP_DIR/main_"*.json 2>/dev/null | head -1)
        if [ -n "$LATEST" ]; then
            LATEST_TIME=$(basename "$LATEST" | sed "s/main_//;s/\.json//")
            SIZE=$(du -h "$LATEST" | cut -f1)
            echo -e "  ${GREEN}●${NC} main (testing)"
            echo -e "    Backup terbaru: ${YELLOW}$LATEST_TIME${NC} ($SIZE)"
            echo ""
        fi
    fi

    if [ "$FOUND" -eq 0 ]; then
        echo -e "  ${RED}Tidak ada klien ditemukan di /var/www/${NC}"
        echo ""
    fi

    echo "───────────────────────────────────────────"
    echo "  Backup tersimpan di: $BACKUP_DIR/"
    echo ""
    echo "  Cara restore:"
    echo "  bash restore.sh <nama-klien>              # restore terbaru"
    echo "  bash restore.sh <nama-klien> <timestamp>  # restore tertentu"
    echo ""
    exit 0
fi

# ── Restore ──
CLIENT_NAME="$1"
TIMESTAMP="$2"

# Tentukan folder klien
if [ "$CLIENT_NAME" = "main" ]; then
    CLIENT_DIR="/root/pesantren-absensi"
    PM2_NAME="pesantren-absensi"
    BACKUP_PREFIX="main"
else
    # Cek di /var/www/
    if [ -d "/var/www/$CLIENT_NAME" ]; then
        CLIENT_DIR="/var/www/$CLIENT_NAME"
    else
        echo -e "${RED}Error: Folder klien tidak ditemukan: /var/www/$CLIENT_NAME${NC}"
        exit 1
    fi
    PM2_NAME="absensi-${CLIENT_NAME}"
    BACKUP_PREFIX="$CLIENT_NAME"
fi

# Cari file backup
if [ -n "$TIMESTAMP" ]; then
    BACKUP_FILE="$BACKUP_DIR/${BACKUP_PREFIX}_${TIMESTAMP}.json"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Backup tidak ditemukan: $BACKUP_FILE${NC}"
        echo ""
        echo "Backup yang tersedia:"
        ls -1t "$BACKUP_DIR/${BACKUP_PREFIX}_"*.json 2>/dev/null | head -10 | while read f; do
            echo "  $(basename "$f" | sed "s/${BACKUP_PREFIX}_//;s/\.json//")"
        done
        exit 1
    fi
else
    BACKUP_FILE=$(ls -t "$BACKUP_DIR/${BACKUP_PREFIX}_"*.json 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Tidak ada backup untuk $CLIENT_NAME${NC}"
        exit 1
    fi
fi

BACKUP_TIME=$(basename "$BACKUP_FILE" | sed "s/${BACKUP_PREFIX}_//;s/\.json//")
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo ""
echo "═══════════════════════════════════════════"
echo "  Restore: $CLIENT_NAME"
echo "═══════════════════════════════════════════"
echo ""
echo -e "  Backup:  ${YELLOW}$BACKUP_TIME${NC} ($BACKUP_SIZE)"
echo -e "  Target:  $CLIENT_DIR/data.json"
echo ""

# Konfirmasi
read -p "  Lanjut restore? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "  Dibatalkan."
    exit 0
fi

# Backup data.json yang ada (jaga-jaga)
if [ -f "$CLIENT_DIR/data.json" ]; then
    SAFETY_BACKUP="$BACKUP_DIR/${BACKUP_PREFIX}_pre-restore_$(date '+%Y%m%d_%H%M%S').json"
    cp "$CLIENT_DIR/data.json" "$SAFETY_BACKUP"
    echo -e "  ${GREEN}✓${NC} Backup aman sebelum restore: $(basename "$SAFETY_BACKUP")"
fi

# Restore
cp "$BACKUP_FILE" "$CLIENT_DIR/data.json"
echo -e "  ${GREEN}✓${NC} data.json berhasil di-restore"

# Restart PM2
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_NAME" --silent
    echo -e "  ${GREEN}✓${NC} PM2 $PM2_NAME di-restart"
else
    echo -e "  ${YELLOW}⚠${NC} PM2 $PM2_NAME tidak ditemukan (skip restart)"
fi

echo ""
echo -e "  ${GREEN}✅ Restore selesai!${NC}"
echo ""
