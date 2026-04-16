# 🕌 Pesantren Absensi

Sistem absensi santri berbasis web. Simple, cepat, tidak perlu database.

## Fitur

**Admin (Pengurus):**
- Dashboard statistik (total santri, hadir, izin, alfa)
- CRUD data santri (nama, kamar, status)
- CRUD kamar (nama, kapasitas, pengurus)
- CRUD akun pengguna (tambah ustadz/admin)
- Rekap absensi (filter tanggal & kamar)
- Buat/hapus pengumuman

**Ustadz:**
- Dashboard statistik
- Absensi santri (Hadir / Izin / Sakit / Alfa)
- Lihat data santri
- Lihat rekap absensi

## Tech Stack

- **Backend:** Express.js
- **Database:** JSON file (data.json) — tidak perlu install database
- **Auth:** JWT + bcrypt
- **Frontend:** Single HTML file, vanilla JS, mobile-friendly

## Instalasi

```bash
# Clone repo
git clone https://github.com/rezaulin/pesantren-absensi.git
cd pesantren-absensi

# Install dependency (cuma 3 paket)
npm install

# Jalankan server
node server.js
```

Buka browser: `http://localhost:3000`

## Login Default

| Username | Password   | Role  |
|----------|------------|-------|
| admin    | admin123   | Admin |

> ⚠️ Ganti password default setelah login pertama!

## Konfigurasi

Semua konfigurasi via environment variable:

```bash
# Ganti port (default: 3000)
PORT=8080 node server.js

# Ganti secret key JWT
JWT_SECRET=rahasia-kamu node server.js
```

## Struktur File

```
pesantren-absensi/
├── server.js           # Backend API + static server
├── public/
│   └── index.html      # Frontend (SPA, semua di 1 file)
├── package.json        # Dependencies
├── data.json           # Database (auto-generated)
└── .gitignore
```

## API Endpoints

### Auth
- `POST /api/login` — Login, dapat token JWT
- `GET /api/me` — Info user yang sedang login

### Dashboard
- `GET /api/dashboard` — Statistik absensi hari ini

### Users (Admin only)
- `GET /api/users` — Daftar pengguna
- `POST /api/users` — Tambah pengguna
- `PUT /api/users/:id` — Edit pengguna
- `DELETE /api/users/:id` — Hapus pengguna

### Kamar
- `GET /api/kamar` — Daftar kamar + jumlah santri
- `POST /api/kamar` — Tambah kamar (admin)
- `PUT /api/kamar/:id` — Edit kamar (admin)
- `DELETE /api/kamar/:id` — Hapus kamar (admin)

### Santri
- `GET /api/santri` — Daftar santri (filter: kamar_id, status)
- `GET /api/santri/:id` — Detail santri
- `POST /api/santri` — Tambah santri (admin)
- `PUT /api/santri/:id` — Edit santri (admin)
- `DELETE /api/santri/:id` — Hapus santri (admin)

### Absensi
- `GET /api/absensi` — Data absensi (filter: tanggal, kamar_id)
- `POST /api/absensi/bulk` — Simpan absensi massal

### Rekap
- `GET /api/rekap` — Rekap absensi (filter: dari, sampai, kamar_id)

### Pengumuman
- `GET /api/pengumuman` — Daftar pengumuman
- `POST /api/pengumuman` — Buat pengumuman (admin)
- `DELETE /api/pengumuman/:id` — Hapus pengumuman (admin)

## Deploy ke VPS

```bash
# Install Node.js (jika belum)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install nodejs -y

# Clone & install
git clone https://github.com/rezaulin/pesantren-absensi.git
cd pesantren-absensi
npm install

# Jalankan dengan pm2 (supaya tetap jalan)
sudo npm install -g pm2
pm2 start server.js --name pesantren
pm2 save
pm2 startup

# Akses dari browser
# http://IP_VPS_ANDA:3000
```

## Backup Data

Database tersimpan di `data.json`. Cukup copy file ini untuk backup:

```bash
cp data.json data-backup-$(date +%Y%m%d).json
```

## License

ISC
