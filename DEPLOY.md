# ══════════════════════════════════════════════════════════
# DEPLOY GUIDE - Jualan Web Absensi Pesantren
# ══════════════════════════════════════════════════════════

## Opsi 1: Multi-Klien di 1 VPS (Recommended buat mulai)

Satu VPS, banyak klien. Setiap klien beda port & domain.
Paling hemat, cocok buat 5-20 klien.

### Struktur Biaya
```
VPS 4vCPU 8GB (Rp 200rb/bulan)
├── klien-1.absensi.com   → port 3001
├── klien-2.absensi.com   → port 3002
├── klien-3.absensi.com   → port 3003
└── dst...
```

### Cara Deploy Klien Baru (1 perintah!)

```bash
# Jalankan script deploy
bash /root/pesantren-absensi/deploy-client.sh <nama> <port> <domain>

# Contoh:
bash /pesantren-absensi/deploy-client.sh pondok-alfalah 3001 absensi.alfalah.sch.id
bash /pesantren-absensi/deploy-client.sh ma-hikmah 3002 absensi.hikmah.sch.id
```

Script otomatis:
1. Clone repo ke `/var/www/<nama>`
2. Install npm dependencies
3. Init database baru (data.json kosong)
4. Start PM2 process baru
5. Setup Nginx reverse proxy

### Setelah deploy script jalan:

**Di Cloudflare:**
1. Tambah A Record: `<domain>` → IP VPS
2. Buat Origin Certificate (SSL/TLS → Origin Server → Create)
3. Paste cert & key ke `/etc/nginx/ssl/absensi-<nama>.crt` & `.key`
4. Set SSL mode: Full (Strict)
5. Reload nginx: `systemctl reload nginx`

**Di Aplikasi:**
1. Buka `https://<domain>`
2. Login: `admin` / `admin123`
3. Ganti password admin!
4. Setting nama aplikasi & logo

---

## Opsi 2: Docker Deployment

Portable, bisa deploy ke mana aja (VPS, cloud, local).

### Setup di VPS baru:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repo
git clone https://github.com/rezaulin/pesantren-absensi.git
cd pesantren-absensi

# Edit docker-compose.yml (ganti port & nama)
nano docker-compose.yml

# Jalankan
docker compose up -d

# Cek status
docker compose ps
docker compose logs -f
```

### Tambah klien baru di Docker:

Edit `docker-compose.yml`, tambah block:

```yaml
services:
  pesantren-klien-baru:
    build: .
    container_name: pesantren-klien-baru
    restart: unless-stopped
    ports:
      - "3010:3000"
    environment:
      - PORT=3000
      - JWT_SECRET=random-secret-disini
    volumes:
      - ./data-klien-baru:/app/data
```

```bash
docker compose up -d pesantren-klien-baru
```

### Docker Commands Berguna:

```bash
# Lihat semua container
docker compose ps

# Lihat log
docker compose logs -f pesantren-alfa

# Restart 1 klien
docker compose restart pesantren-alfa

# Stop semua
docker compose down

# Update code (pull terbaru)
git pull
docker compose build
docker compose up -d

# Backup data klien
docker cp pesantren-alfa:/app/data/data.json ./backup-alfa.json
```

---

## Opsi 3: VPS per Klien (Full Isolation)

1 klien = 1 VPS. Cocok buat klien besar / minta dedicated.

### Setup:
1. Buat VPS baru (bisa pakai script VPS provider)
2. Ikuti `README.md` instalasi dari nol
3. Setup domain & SSL

### Biaya:
```
VPS kecil (Rp 60rb/bulan) × jumlah klien
Cocok kalau klien bayar Rp 200rb+/bulan
```

---

## Template Nginx Multi-Domain

File: `/etc/nginx/sites-enabled/absensi-all`

```nginx
# Klien 1
server {
    listen 80;
    listen 443 ssl;
    server_name absensi.alfalah.sch.id;
    ssl_certificate /etc/nginx/ssl/absensi-alfa.crt;
    ssl_certificate_key /etc/nginx/ssl/absensi-alfa.key;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# Klien 2
server {
    listen 80;
    listen 443 ssl;
    server_name absensi.hikmah.sch.id;
    ssl_certificate /etc/nginx/ssl/absensi-hikmah.crt;
    ssl_certificate_key /etc/nginx/ssl/absensi-hikmah.key;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
# Tambah block di atas untuk klien baru
```

---

## Workflow Jualan (Step by Step)

```
1. Klien order → bayar
2. Jalankan: deploy-client.sh <nama> <port> <domain>
3. Setup Cloudflare:
   - A record: <domain> → IP VPS
   - Origin certificate → simpan di VPS
   - SSL mode: Full (Strict)
4. Buka https://<domain>, login admin/admin123
5. Ganti password, setting nama & logo
6. Kirim link ke klien!
```

Waktu deploy per klien: **~3 menit** (kalau domain sudah ready)

---

## Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | 3000 | Port aplikasi |
| `JWT_SECRET` | pesantren-secret-key | Secret untuk JWT (WAJIB ganti!) |
| `DATA_FILE` | ./data.json | Path database JSON |

Contoh:
```bash
PORT=3001 JWT_SECRET=randomabc123 DATA_FILE=/var/www/klien/data.json node server.js
```

---

## Monitoring Semua Klien

```bash
# Status semua klien
pm2 status

# Log real-time semua
pm2 logs

# Log 1 klien
pm2 logs absensi-pondok-alfalah

# Restart semua
pm2 restart all

# Restart 1 klien
pm2 restart absensi-pondok-alfalah

# Resource usage
pm2 monit
```

---

## Backup Semua Klien (Auto)

```bash
# Tambah ke crontab (backup setiap jam)
# File: /root/backup-all.sh

#!/bin/bash
for dir in /var/www/pesantren-*; do
    if [ -f "$dir/data.json" ]; then
        NAME=$(basename "$dir")
        cp "$dir/data.json" "/root/backups/${NAME}_$(date +%Y%m%d_%H%M).json"
    fi
done
# Hapus backup > 7 hari
find /root/backups -name "*.json" -mtime +7 -delete
```

---

## Harga Suggest

| Paket | Harga/Bulan | Fitur |
|-------|-------------|-------|
| Basic | Rp 100rb | Standar, max 100 santri |
| Standard | Rp 200rb | Standar, max 500 santri |
| Premium | Rp 350rb | Unlimited + custom logo/nama + priority support |
| Setup Fee | Rp 50rb | Sekali bayar (domain klien sendiri) |
