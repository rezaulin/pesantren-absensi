# Panduan Instalasi - Sistem Absensi Pesantren

## Daftar Isi
1. [Prasyarat](#prasyarat)
2. [Instalasi Node.js](#instalasi-nodejs)
3. [Instalasi PostgreSQL](#instalasi-postgresql)
4. [Setup Project](#setup-project)
5. [Setup Database](#setup-database)
6. [Menjalankan Aplikasi](#menjalankan-aplikasi)
7. [Troubleshooting](#troubleshooting)

---

## Prasyarat

Sebelum memulai, pastikan komputer Anda memiliki:
- Sistem Operasi: Windows 10/11, macOS, atau Linux
- Koneksi internet untuk download package
- Minimal 2GB RAM
- 500MB ruang disk kosong

---

## Instalasi Node.js

### Windows
1. Buka browser, kunjungi https://nodejs.org
2. Download versi LTS (Long Term Support) - direkomendasikan
3. Jalankan installer (.msi)
4. Ikuti wizard instalasi, klik "Next" terus
5. **PENTING**: Pastikan opsi "Add to PATH" dicentang
6. Selesai, restart komputer

### macOS
1. Buka Terminal (Cmd + Space, ketik "Terminal")
2. Install Homebrew jika belum ada:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Install Node.js:
   ```bash
   brew install node
   ```

### Linux (Ubuntu/Debian)
1. Buka Terminal (Ctrl + Alt + T)
2. Install Node.js:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```

### Verifikasi Instalasi
Buka Terminal/Command Prompt, ketik:
```bash
node --version
npm --version
```
Pastikan menampilkan versi (contoh: v18.17.0)

---

## Instalasi PostgreSQL

### Windows
1. Kunjungi https://www.postgresql.org/download/windows/
2. Download PostgreSQL installer
3. Jalankan installer
4. **PENTING**: Ingat password yang Anda buat untuk user "postgres"
5. Port default: 5432 (biarkan saja)
6. Centang "Stack Builder" jika ditanya
7. Selesai

### macOS
1. Buka Terminal
2. Install dengan Homebrew:
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

### Linux (Ubuntu/Debian)
1. Buka Terminal
2. Install PostgreSQL:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

### Verifikasi Instalasi
```bash
psql --version
```

---

## Setup Project

### 1. Clone atau Download Project
```bash
# Jika menggunakan Git
git clone https://github.com/rezaulin/pesantren-absensi.git
cd pesantren-absensi

# Atau download ZIP dari GitHub, lalu extract
```

### 2. Install Dependencies Backend
```bash
cd backend
npm install
```

### 3. Setup Environment Variables
```bash
# Di folder backend, copy file contoh
cp .env.example .env

# Edit file .env dengan editor teks
# Windows: notepad .env
# macOS/Linux: nano .env
```

Isi file `.env`:
```
PORT=3000
NODE_ENV=development

# Sesuaikan dengan konfigurasi PostgreSQL Anda
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pesantren_absensi
DB_USER=postgres
DB_PASSWORD=password_anda_di_sini

# Generate random string untuk JWT
JWT_SECRET=rahasia_jwt_yang_sangat_aman_12345
JWT_EXPIRES_IN=24h
```

---

## Setup Database

### 1. Buat Database
Buka Terminal/Command Prompt:

```bash
# Login ke PostgreSQL
psql -U postgres

# Di prompt PostgreSQL, buat database
CREATE DATABASE pesantren_absensi;

# Keluar dari psql
\q
```

### 2. Jalankan Migrasi (Buat Tabel)
```bash
# Di folder backend
npm run migrate
```

Output yang diharapkan:
```
🚀 Memulai migrasi database...
  ✅ Tabel users berhasil dibuat
  ✅ Tabel kamar berhasil dibuat
  ✅ Tabel santri berhasil dibuat
  ✅ Tabel jenis_absensi berhasil dibuat
  ✅ Tabel log_absensi berhasil dibuat
  ✅ Index berhasil dibuat

🎉 Migrasi database berhasil diselesaikan!
```

### 3. Jalankan Seed (Data Awal)
```bash
npm run seed
```

Output yang diharapkan:
```
🌱 Memulai seeding database...
  📝 Membuat data user...
  📝 Membuat jenis absensi...
  📝 Membuat data kamar...
  📝 Membuat data santri...
  📝 Membuat data absensi contoh...

🎉 Seeding database berhasil!

📋 INFORMASI LOGIN DEFAULT:
   Admin:    username=admin,  password=admin123
   Pengurus: username=ahmad,  password=pengurus123
```

---

## Menjalankan Aplikasi

### Mode Development (dengan auto-reload)
```bash
# Di folder root project
npm run dev

# Atau di folder backend
cd backend
npm run dev
```

### Mode Production
```bash
# Di folder root project
npm start
```

### Akses Aplikasi
1. Buka browser
2. Kunjungi: http://localhost:3000
3. Login dengan:
   - **Admin**: username=`admin`, password=`admin123`
   - **Pengurus**: username=`ahmad`, password=`pengurus123`

---

## Troubleshooting

### Error: "Cannot find module"
**Solusi**: Install dependencies
```bash
cd backend
npm install
```

### Error: "Connection refused" (Database)
**Solusi**: Pastikan PostgreSQL berjalan
```bash
# Windows: Cek Services (services.msc)
# macOS:
brew services start postgresql@15
# Linux:
sudo systemctl start postgresql
```

### Error: "password authentication failed"
**Solusi**: Cek password di file `.env`
```
DB_PASSWORD=password_yang_benar
```

### Error: "database does not exist"
**Solusi**: Buat database dulu
```bash
psql -U postgres
CREATE DATABASE pesantren_absensi;
\q
```

### Error: "Port 3000 already in use"
**Solusi**: Ganti port di `.env`
```
PORT=3001
```

### Error: "JWT malformed"
**Solusi**: Hapus localStorage browser
1. Buka Developer Tools (F12)
2. Tab Application → Local Storage
3. Hapus semua data
4. Refresh halaman

---

## Struktur Folder Project

```
pesantren-absensi/
├── backend/
│   ├── config/
│   │   └── database.js      # Konfigurasi koneksi PostgreSQL
│   ├── controllers/
│   │   ├── authController.js # Handler login/register
│   │   ├── santriController.js # Handler CRUD santri
│   │   ├── kamarController.js # Handler CRUD kamar
│   │   └── absensiController.js # Handler absensi
│   ├── database/
│   │   ├── migrate.js        # Script buat tabel
│   │   └── seed.js           # Script isi data awal
│   ├── middleware/
│   │   └── auth.js           # Middleware JWT
│   ├── routes/
│   │   ├── authRoutes.js     # Route autentikasi
│   │   ├── santriRoutes.js   # Route data santri
│   │   ├── kamarRoutes.js    # Route data kamar
│   │   └── absensiRoutes.js  # Route absensi
│   ├── .env.example          # Contoh environment
│   ├── package.json          # Dependencies
│   └── server.js             # Entry point
├── frontend/
│   ├── css/
│   │   └── style.css         # Style Material Design
│   ├── js/
│   │   ├── api.js            # Helper API calls
│   │   ├── auth.js           # Handler autentikasi
│   │   ├── app.js            # Router SPA
│   │   ├── dashboard.js      # Halaman dashboard
│   │   ├── absensi.js        # Halaman absensi
│   │   └── rekap.js          # Halaman rekap
│   └── index.html            # Halaman utama SPA
├── database/
│   ├── schema.sql            # SQL schema
│   └── seed.sql              # Data awal
├── docs/
│   ├── ERD.md                # Diagram database
│   ├── API.md                # Dokumentasi API
│   └── SETUP.md              # Panduan ini
├── package.json              # Root package.json
└── README.md                 # Dokumentasi utama
```

---

## Perintah Berguna

```bash
# Jalankan server
npm start

# Jalankan dengan auto-reload (development)
npm run dev

# Buat ulang database
npm run db:migrate

# Isi ulang data awal
npm run db:seed

# Install semua dependencies
npm run install:all
```
