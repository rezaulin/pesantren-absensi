# FAONSI - Sistem Absensi Pesantren

Sistem absensi santri pesantren berbasis web. Bisa diakses via HP (PWA - install ke home screen).

## Fitur

- **Absensi Harian** — Ngaji Pagi, Ngaji Qur'an Siang, Bakat, Madrasah Diniyyah, Ngaji Malam, Sekolah Formal
- **Absen Malam** — Absen khusus malam hari (Hadir/Alfa)
- **Absen Sekolah Formal** — Absen terpisah untuk sekolah formal, filter per kelas
- **Data Santri** — Nama, Kamar, Kelas Diniyyah, Kelompok Ngaji, Kelas Sekolah, Jenis Bakat, Status
- **Kelola Kamar** — Nama kamar, kapasitas, pengurus
- **Kelola Kegiatan** — Tambah/hapus jenis kegiatan absensi
- **Rekap Absensi** — Filter tanggal, kamar, kegiatan + Export PDF
- **Sensus Santri** — Statistik per kamar
- **Pengumuman** — Buat/hapus pengumuman
- **Pengaturan** — Ubah nama aplikasi & upload logo
- **Role-based Access** — Admin (full akses) & Ustadz (absensi + lihat data)
- **PWA** — Install ke home screen Android/iOS

## Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** JSON file (`data.json`)
- **Frontend:** Single-file HTML/CSS/JS (tanpa framework)
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx
- **SSL:** Cloudflare (Full Strict mode)
- **Auth:** JWT + bcrypt

---

## Instalasi dari Nol (VPS Baru)

Dokumen ini untuk restore aplikasi jika VPS mati/migrasi ke server baru.
Asumsi: **Ubuntu 22.04 LTS**, domain sudah pointing ke IP VPS via Cloudflare.

### 1. Update System & Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # harusnya v22.x
npm -v    # harusnya 10.x

# Install Nginx
sudo apt install -y nginx

# Install PM2 (global)
sudo npm install -g pm2
```

### 2. Clone Repository

```bash
# Clone repo ke /root
cd /root
git clone https://github.com/rezaulin/pesantren-absensi.git
cd pesantren-absensi

# Install dependencies Node.js
npm install
```

### 3. Restore Database (`data.json`)

File `data.json` di-gitignore karena berisi data sensitif (password hash, data santri).
Restore dari backup:

```bash
# Kalau ada backup data.json, copy ke sini
cp /path/to/backup/data.json /root/pesantren-absensi/data.json

# Kalau tidak ada backup, server akan buat data.json baru otomatis
# dengan default admin: admin / admin123
```

**PENTING:** Selalu backup `data.json` secara berkala! Lihat section "Backup" di bawah.

### 4. Start Aplikasi dengan PM2

```bash
# Start aplikasi
cd /root/pesantren-absensi
pm2 start server.js --name pesantren-absensi

# Auto-start saat VPS reboot
pm2 startup
# Jalankan command yang muncul dari output di atas

# Save process list
pm2 save

# Cek status
pm2 status
pm2 logs pesantren-absensi --lines 20
```

Aplikasi jalan di `http://localhost:3000`.

### 5. Setup Nginx (Reverse Proxy)

```bash
# Buat config Nginx
sudo nano /etc/nginx/sites-enabled/absensi
```

Isi file (ganti `absen.reviewtechno.me` dengan domain kamu):

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name absen.reviewtechno.me;

    # SSL Certificate (dari Cloudflare Origin Certificate)
    ssl_certificate /etc/nginx/ssl/absensi.crt;
    ssl_certificate_key /etc/nginx/ssl/absensi.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. Setup SSL (Cloudflare Origin Certificate)

#### 6a. Buat Origin Certificate di Cloudflare

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih domain → **SSL/TLS** → **Origin Server**
3. Klik **Create Certificate**
4. Pilih:
   - Private key type: **RSA (2048)**
   - Certificate validity: **15 years**
5. Klik **Create**
6. Copy **Origin Certificate** dan **Private Key**

#### 6b. Simpan Certificate di VPS

```bash
# Buat folder SSL
sudo mkdir -p /etc/nginx/ssl

# Paste Origin Certificate
sudo nano /etc/nginx/ssl/absensi.crt
# (paste isi certificate, simpan)

# Paste Private Key
sudo nano /etc/nginx/ssl/absensi.key
# (paste isi private key, simpan)

# Set permission
sudo chmod 600 /etc/nginx/ssl/absensi.key
sudo chmod 644 /etc/nginx/ssl/absensi.crt
```

#### 6c. Cloudflare DNS Settings

1. Cloudflare Dashboard → **DNS** → **Records**
2. Tambah A record:
   - **Type:** A
   - **Name:** `absen` (atau subdomain kamu)
   - **Content:** IP VPS kamu (contoh: `157.245.200.128`)
   - **Proxy status:** Proxied (orange cloud ON)
3. SSL/TLS → **Overview** → Pilih **Full (Strict)**

#### 6d. Test & Restart Nginx

```bash
# Test config Nginx
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Cek status
sudo systemctl status nginx
```

### 7. Firewall (UFW)

```bash
# Aktifkan UFW jika belum
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Cek status
sudo ufw status
```

### 8. Verifikasi

```bash
# Test dari server
curl -I http://localhost:3000
curl -I https://absen.reviewtechno.me

# Cek PM2
pm2 status
pm2 logs pesantren-absensi

# Buka di browser
# https://absen.reviewtechno.me
```

Login default: `admin` / `admin123`

**Langsung ganti password admin setelah login pertama!**

---

## Struktur Project

```
pesantren-absensi/
├── server.js              # Backend Express.js (API + auth + PDF)
├── package.json           # Dependencies
├── .gitignore
├── data.json              # Database (di-gitignore, backup terpisah!)
├── public/
│   ├── index.html         # Frontend (single-file HTML/CSS/JS)
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker (PWA)
│   ├── icon-192.png       # PWA icon kecil
│   └── icon-512.png       # PWA icon besar
└── README.md              # Dokumen ini
```

## API Endpoints

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| POST | `/api/login` | - | - | Login, return JWT |
| GET | `/api/me` | JWT | - | Info user login |
| GET | `/api/dashboard` | JWT | - | Statistik ringkas |
| GET | `/api/users` | JWT | Admin | List users |
| POST | `/api/users` | JWT | Admin | Tambah user |
| PUT | `/api/users/:id` | JWT | Admin | Edit user |
| DELETE | `/api/users/:id` | JWT | Admin | Hapus user |
| GET | `/api/kamar` | JWT | - | List kamar |
| POST | `/api/kamar` | JWT | Admin | Tambah kamar |
| PUT | `/api/kamar/:id` | JWT | Admin | Edit kamar |
| DELETE | `/api/kamar/:id` | JWT | Admin | Hapus kamar |
| GET | `/api/santri` | JWT | - | List santri (filter: kamar_id, kelas_diniyyah, kelompok_ngaji, kelas_sekolah, jenis_bakat) |
| POST | `/api/santri` | JWT | Admin | Tambah santri |
| PUT | `/api/santri/:id` | JWT | Admin | Edit santri |
| DELETE | `/api/santri/:id` | JWT | Admin | Hapus santri |
| GET | `/api/kegiatan` | JWT | - | List kegiatan |
| POST | `/api/kegiatan` | JWT | Admin | Tambah kegiatan |
| PUT | `/api/kegiatan/:id` | JWT | Admin | Edit kegiatan |
| DELETE | `/api/kegiatan/:id` | JWT | Admin | Hapus kegiatan |
| GET | `/api/absensi` | JWT | - | List absensi (filter: tanggal, kegiatan_id, kamar_id) |
| POST | `/api/absensi/bulk` | JWT | - | Simpan absensi bulk |
| GET | `/api/rekap` | JWT | - | Rekap absensi (filter: dari, sampai, kegiatan_id, kamar_id) |
| GET | `/api/pengumuman` | JWT | - | List pengumuman |
| POST | `/api/pengumuman` | JWT | Admin | Buat pengumuman |
| DELETE | `/api/pengumuman/:id` | JWT | Admin | Hapus pengumuman |
| GET | `/api/settings` | - | - | Pengaturan app |
| PUT | `/api/settings` | JWT | Admin | Update pengaturan |
| POST | `/api/settings/logo` | JWT | Admin | Upload logo |
| GET | `/api/export/pdf` | JWT | - | Export rekap ke PDF |

## Backup Database

### Manual Backup

```bash
# Copy data.json ke lokasi aman
cp /root/pesantren-absensi/data.json /root/backup/data.json.$(date +%Y%m%d)
```

### Auto Backup ke GitHub (Private Repo)

```bash
# Buat script backup
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
cd /root/pesantren-absensi
cp data.json /tmp/data-backup.json
cd /tmp
git init backup-db 2>/dev/null
cd backup-db
cp /tmp/data-backup.json data.json
git add data.json
git commit -m "backup $(date +%Y-%m-%d_%H%M)" 2>/dev/null
git push -f https://rezaulin:TOKEN@github.com/rezaulin/pesantren-absensi-backup.git main 2>/dev/null
echo "Backup done: $(date)"
EOF

chmod +x /root/backup-db.sh

# Tambahkan ke crontab (backup setiap jam)
(crontab -l 2>/dev/null; echo "0 * * * * /root/backup-db.sh >> /root/backup.log 2>&1") | crontab -
```

### Restore dari Backup

```bash
# Download dari GitHub backup repo
cd /root/pesantren-absensi
git clone https://github.com/rezaulin/pesantren-absensi-backup.git /tmp/backup-restore
cp /tmp/backup-restore/data.json ./data.json
pm2 restart pesantren-absensi
```

## Troubleshooting

### Server tidak jalan (502 Bad Gateway)

```bash
# Cek PM2
pm2 status
pm2 logs pesantren-absensi --lines 50

# Restart
pm2 restart pesantren-absensi

# Kalau PM2 hilang setelah reboot
pm2 resurrect
```

### Nginx error

```bash
# Cek error log
sudo tail -50 /var/log/nginx/error.log

# Test config
sudo nginx -t

# Restart
sudo systemctl restart nginx
```

### Port 3000 sudah dipakai

```bash
# Cek siapa yang pakai port 3000
sudo lsof -i :3000

# Kill proses
sudo kill -9 <PID>

# Restart app
pm2 restart pesantren-absensi
```

### Reset password admin

```bash
cd /root/pesantren-absensi
node -e "
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = JSON.parse(fs.readFileSync('data.json'));
const admin = db.users.find(u => u.username === 'admin');
if (admin) {
  admin.password_hash = bcrypt.hashSync('admin123', 10);
  fs.writeFileSync('data.json', JSON.stringify(db, null, 2));
  console.log('Password admin direset ke: admin123');
}
"
pm2 restart pesantren-absensi
```

### PM2 hilang setelah VPS reboot

```bash
# Restore PM2 process list
pm2 resurrect

# Kalau tidak ada, start ulang
cd /root/pesantren-absensi
pm2 start server.js --name pesantren-absensi
pm2 save
pm2 startup
```

---

## License

Private project. Tidak untuk distribusi.
