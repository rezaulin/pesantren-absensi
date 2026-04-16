# Sistem Absensi Pesantren 🕌

Sistem informasi untuk mengelola absensi kehadiran santri di pesantren. Dibangun dengan arsitektur fullstack menggunakan Node.js, Express, PostgreSQL, dan JavaScript vanilla.

## 📸 Demo

![Demo Screenshot](https://via.placeholder.com/800x400/2E7D32/FFFFFF?text=Sistem+Absensi+Pesantren)

> Screenshot akan ditambahkan setelah aplikasi berjalan

## ✨ Fitur Utama

- **Autentikasi JWT** - Login aman dengan token
- **Dashboard** - Tampilan utama dengan statistik dan menu grid
- **5 Jenis Absensi** - Malam, Berjamaah, Sakit Pagi, Pengajian, Rekap
- **CRUD Santri** - Tambah, edit, hapus data santri
- **CRUD Kamar** - Kelola data kamar asrama
- **Rekap Absensi** - Filter berdasarkan bulan, jenis, dan kamar
- **Role-Based Access** - Admin dan Pengurus dengan hak akses berbeda
- **Responsive Design** - Tampil bagus di HP dan desktop

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime JavaScript di server
- **Express.js** - Framework web untuk membuat API REST
- **PostgreSQL** - Database relasional yang powerful
- **JWT (jsonwebtoken)** - Untuk autentikasi stateless
- **bcryptjs** - Untuk hash password yang aman

### Frontend
- **HTML5** - Struktur halaman
- **CSS3** - Styling dengan Material Design
- **JavaScript (Vanilla)** - Tanpa framework, mudah dipelajari
- **Material Icons** - Ikon dari Google

### Kenapa Dipilih?

| Teknologi | Alasan |
|------------|--------|
| Node.js | JavaScript di backend, satu bahasa untuk fullstack |
| Express | Ringan, mudah dipelajari, dokumentasi lengkap |
| PostgreSQL | Database relasional yang handal dan gratis |
| JWT | Standar industri untuk autentikasi API |
| Vanilla JS | Tanpa framework, fokus pada konsep dasar |

## 📁 Struktur Folder

```
pesantren-absensi/
├── backend/                    # Kode backend (server)
│   ├── config/
│   │   └── database.js        # Konfigurasi koneksi PostgreSQL
│   ├── controllers/
│   │   ├── authController.js  # Handler login/register
│   │   ├── santriController.js # Handler data santri
│   │   ├── kamarController.js # Handler data kamar
│   │   └── absensiController.js # Handler absensi
│   ├── database/
│   │   ├── migrate.js         # Script buat tabel
│   │   └── seed.js            # Script isi data awal
│   ├── middleware/
│   │   └── auth.js            # Middleware JWT
│   ├── routes/
│   │   ├── authRoutes.js      # Route autentikasi
│   │   ├── santriRoutes.js    # Route data santri
│   │   ├── kamarRoutes.js     # Route data kamar
│   │   └── absensiRoutes.js   # Route absensi
│   ├── .env.example           # Contoh environment variables
│   ├── package.json           # Dependencies backend
│   └── server.js              # Entry point server
├── frontend/                   # Kode frontend (browser)
│   ├── css/
│   │   └── style.css          # Style Material Design
│   ├── js/
│   │   ├── api.js             # Helper untuk API calls
│   │   ├── auth.js            # Handler autentikasi
│   │   ├── app.js             # Router SPA
│   │   ├── dashboard.js       # Halaman dashboard
│   │   ├── absensi.js         # Halaman form absensi
│   │   └── rekap.js           # Halaman rekap absensi
│   └── index.html             # Halaman utama SPA
├── database/                   # SQL files
│   ├── schema.sql             # Definisi tabel
│   └── seed.sql               # Data awal
├── docs/                       # Dokumentasi
│   ├── ERD.md                 # Diagram database
│   ├── API.md                 # Dokumentasi API
│   └── SETUP.md               # Panduan instalasi
├── package.json               # Root package.json
└── README.md                  # File ini
```

## 🚀 Cara Instalasi

### Prasyarat
- Node.js v14 atau lebih baru
- PostgreSQL v12 atau lebih baru
- Git (opsional)

### Langkah 1: Clone Repository
```bash
git clone https://github.com/rezaulin/pesantren-absensi.git
cd pesantren-absensi
```

### Langkah 2: Install Dependencies
```bash
# Install dependencies backend
cd backend
npm install
```

### Langkah 3: Setup Database
```bash
# Login ke PostgreSQL
psql -U postgres

# Buat database
CREATE DATABASE pesantren_absensi;
\q
```

### Langkah 4: Konfigurasi Environment
```bash
# Di folder backend
cp .env.example .env

# Edit file .env, sesuaikan:
# DB_PASSWORD=password_postgres_anda
# JWT_SECRET=string_random_untuk_keamanan
```

### Langkah 5: Jalankan Migrasi
```bash
# Di folder backend
npm run migrate
```

### Langkah 6: Isi Data Awal
```bash
npm run seed
```

### Langkah 7: Jalankan Aplikasi
```bash
# Di folder root atau backend
npm start
# atau untuk development dengan auto-reload:
npm run dev
```

### Langkah 8: Buka di Browser
```
http://localhost:3000
```

## 🏃 Cara Menjalankan

### Mode Development
```bash
cd backend
npm run dev
```
Server akan restart otomatis saat ada perubahan kode.

### Mode Production
```bash
cd backend
npm start
```

### Login Default
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Pengurus | ahmad | pengurus123 |

## 🏗️ Arsitektur Aplikasi

### Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Frontend)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   HTML5     │  │    CSS3     │  │  JavaScript │     │
│  │  index.html │  │ style.css   │  │   app.js    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                          │                               │
│                    fetch() API calls                     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP/JSON
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   SERVER (Backend)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Express.js Server                   │   │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────────────┐  │   │
│  │  │ Routes  │→│Middleware│→│   Controllers   │  │   │
│  │  │ /api/*  │ │  (JWT)   │ │  (Business Logic)│  │   │
│  │  └─────────┘ └──────────┘ └─────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                               │
│                    pg (node-postgres)                    │
└──────────────────────────┬──────────────────────────────┘
                           │ SQL Query
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                  │
│  ┌─────────┐ ┌───────┐ ┌────────┐ ┌───────────────┐   │
│  │  users  │ │ kamar │ │ santri │ │ log_absensi   │   │
│  └─────────┘ └───────┘ └────────┘ └───────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Alur Request

1. **User** membuka aplikasi di browser
2. **Frontend** (JavaScript) mengirim request HTTP ke backend
3. **Backend** (Express) menerima request, memproses:
   - Memvalidasi JWT token (jika perlu autentikasi)
   - Menjalankan business logic di controller
   - Query ke database PostgreSQL
4. **Database** mengembalikan data
5. **Backend** mengirim response JSON ke frontend
6. **Frontend** menampilkan data ke user

## 🔌 Frontend ↔ Backend Connection

### Cara Frontend Terhubung ke Backend

Frontend menggunakan `fetch()` API untuk berkomunikasi dengan backend:

```javascript
// Contoh: Mengambil data santri
const response = await fetch('/api/santri', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

### API Helper (api.js)

File `frontend/js/api.js` menyediakan helper functions:

```javascript
// Fungsi dasar
apiGet('/santri')           // GET request
apiPost('/absensi', data)   // POST request
apiPut('/santri/1', data)   // PUT request
apiDelete('/santri/1')      // DELETE request

// Object API yang lebih mudah digunakan
SantriAPI.getAll()           // Ambil semua santri
SantriAPI.create(data)       // Tambah santri baru
AbsensiAPI.submit(data)      // Submit absensi
KamarAPI.getAll()            // Ambil semua kamar
```

### Token JWT Otomatis

Token JWT otomatis disisipkan ke setiap request:

```javascript
// Di api.js
const token = localStorage.getItem('token');
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

## 🔐 Cara Auth Bekerja (JWT)

### Alur Autentikasi

```
1. LOGIN
   User → POST /api/auth/login {username, password}
   Server → Verifikasi password (bcrypt)
   Server → Buat JWT token
   Server → Return {token, user}
   Frontend → Simpan token ke localStorage

2. REQUEST TERPROTEKSI
   Frontend → GET /api/santri + Header Authorization: Bearer <token>
   Server → Verifikasi token (jwt.verify)
   Server → Ambil data user dari database
   Server → Lanjutkan ke controller
   Server → Return data

3. LOGOUT
   Frontend → Hapus token dari localStorage
   Frontend → Redirect ke halaman login
```

### Struktur JWT Token

```javascript
// Payload token berisi:
{
  userId: 1,        // ID user untuk identifikasi
  role: 'admin',    // Role untuk otorisasi
  iat: 1234567890,  // Waktu dibuat
  exp: 1234567890   // Waktu kadaluarsa (24 jam)
}
```

### Middleware Auth

```javascript
// authenticate - Verifikasi token JWT
router.get('/santri', authenticate, controller.getAll);

// authorize - Cek role user
router.delete('/santri/:id', authenticate, authorize('admin'), controller.delete);
```

## 📖 Dokumentasi Lengkap

- [ERD - Diagram Database](docs/ERD.md)
- [API - Dokumentasi Endpoint](docs/API.md)
- [SETUP - Panduan Instalasi](docs/SETUP.md)

## 🔧 Pengembangan Lebih Lanjut

### Fitur yang Bisa Ditambahkan

1. **Upload Foto Santri**
   - Gunakan multer untuk handle upload
   - Simpan di folder `uploads/`

2. **Export Laporan ke PDF/Excel**
   - Gunakan library seperti pdfkit atau exceljs
   - Tambahkan tombol "Export" di halaman rekap

3. **Notifikasi Real-time**
   - Tambahkan Socket.io untuk notifikasi
   - Alert jika ada santri yang alfa

4. **Dashboard Statistik Lebih Lengkap**
   - Grafik kehadiran per bulan
   - Ranking santri terbaik/terburuk

5. **Multi-pesantren**
   - Tambahkan tabel pesantren
   - Setiap pesantren punya data sendiri

### Cara Menambah Endpoint Baru

1. Buat controller di `backend/controllers/`
2. Buat route di `backend/routes/`
3. Daftarkan route di `backend/server.js`
4. Tambahkan API helper di `frontend/js/api.js`
5. Buat halaman di `frontend/js/`

### Cara Menambah Halaman Baru

1. Tambah fungsi render di file JS baru
2. Tambah case di `app.js` switch statement
3. Tambah menu di `dashboard.js`
4. Load script di `index.html`

## 🐛 Troubleshooting

### "Connection refused"
→ Pastikan PostgreSQL berjalan

### "password authentication failed"
→ Cek password di file `.env`

### "database does not exist"
→ Jalankan: `CREATE DATABASE pesantren_absensi;`

### "Port 3000 already in use"
→ Ganti PORT di `.env`

Lihat [docs/SETUP.md](docs/SETUP.md) untuk panduan troubleshooting lengkap.

## 📝 License

MIT License - bebas digunakan untuk pembelajaran.

## 👨‍💻 Author

Dibuat sebagai project pembelajaran fullstack web development.

---

**Assalamu'alaikum** 🤲 Semoga aplikasi ini bermanfaat untuk pengelolaan pesantren.
