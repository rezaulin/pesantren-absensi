# Dokumentasi API - Sistem Absensi Pesantren

## Base URL
```
http://localhost:3000/api
```

## Autentikasi
Semua endpoint (kecuali login) memerlukan token JWT di header:
```
Authorization: Bearer <token>
```

---

## 1. Autentikasi (Auth)

### 1.1 Login
**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "nama": "Administrator",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

**Response Error (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Username atau password salah"
}
```

---

### 1.2 Registrasi User Baru
**Endpoint**: `POST /api/auth/register`

**Akses**: Hanya admin

**Request Body**:
```json
{
  "nama": "Ustadz Baru",
  "username": "ustadz_baru",
  "password": "password123",
  "role": "pengurus"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "User berhasil didaftarkan",
  "data": {
    "id": 4,
    "nama": "Ustadz Baru",
    "username": "ustadz_baru",
    "role": "pengurus",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 1.3 Get Current User
**Endpoint**: `GET /api/auth/me`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nama": "Administrator",
    "username": "admin",
    "role": "admin"
  }
}
```

---

## 2. Data Santri

### 2.1 Get Semua Santri
**Endpoint**: `GET /api/santri`

**Query Parameters** (opsional):
- `kamar_id`: Filter berdasarkan ID kamar
- `search`: Pencarian berdasarkan nama atau NIS

**Contoh**: `GET /api/santri?kamar_id=1&search=Ahmad`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nis": "2024001",
      "nama": "Muhammad Rizki",
      "kamar_id": 1,
      "status": "aktif",
      "nomor_kamar": "A1",
      "nama_asrama": "Asrama Putra Al-Fatih"
    }
  ],
  "total": 1
}
```

---

### 2.2 Get Detail Santri
**Endpoint**: `GET /api/santri/:id`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nis": "2024001",
    "nama": "Muhammad Rizki",
    "kamar_id": 1,
    "status": "aktif",
    "foto": null,
    "nomor_kamar": "A1",
    "nama_asrama": "Asrama Putra Al-Fatih",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2.3 Tambah Santri Baru
**Endpoint**: `POST /api/santri`

**Akses**: Admin, Pengurus

**Request Body**:
```json
{
  "nis": "2024021",
  "nama": "Santri Baru",
  "kamar_id": 1,
  "status": "aktif"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Santri berhasil ditambahkan",
  "data": {
    "id": 21,
    "nis": "2024021",
    "nama": "Santri Baru",
    "kamar_id": 1,
    "status": "aktif"
  }
}
```

---

### 2.4 Update Santri
**Endpoint**: `PUT /api/santri/:id`

**Akses**: Admin, Pengurus

**Request Body**:
```json
{
  "nama": "Nama Updated",
  "kamar_id": 2,
  "status": "aktif"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Data santri berhasil diupdate",
  "data": {
    "id": 1,
    "nis": "2024001",
    "nama": "Nama Updated",
    "kamar_id": 2,
    "status": "aktif"
  }
}
```

---

### 2.5 Hapus Santri
**Endpoint**: `DELETE /api/santri/:id`

**Akses**: Admin

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Santri berhasil dihapus"
}
```

---

## 3. Data Kamar

### 3.1 Get Semua Kamar
**Endpoint**: `GET /api/kamar`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nomor_kamar": "A1",
      "nama_asrama": "Asrama Putra Al-Fatih",
      "kapasitas": 10,
      "jumlah_santri": 4
    }
  ],
  "total": 5
}
```

---

### 3.2 Get Detail Kamar
**Endpoint**: `GET /api/kamar/:id`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nomor_kamar": "A1",
    "nama_asrama": "Asrama Putra Al-Fatih",
    "kapasitas": 10,
    "santri": [
      {
        "id": 1,
        "nis": "2024001",
        "nama": "Muhammad Rizki",
        "status": "aktif"
      }
    ]
  }
}
```

---

### 3.3 Tambah Kamar Baru
**Endpoint**: `POST /api/kamar`

**Akses**: Admin

**Request Body**:
```json
{
  "nomor_kamar": "A4",
  "nama_asrama": "Asrama Putra Al-Fatih",
  "kapasitas": 10
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Kamar berhasil ditambahkan",
  "data": {
    "id": 6,
    "nomor_kamar": "A4",
    "nama_asrama": "Asrama Putra Al-Fatih",
    "kapasitas": 10
  }
}
```

---

### 3.4 Update Kamar
**Endpoint**: `PUT /api/kamar/:id`

**Akses**: Admin

**Request Body**:
```json
{
  "kapasitas": 12
}
```

---

### 3.5 Hapus Kamar
**Endpoint**: `DELETE /api/kamar/:id`

**Akses**: Admin

**Catatan**: Tidak bisa menghapus kamar yang masih memiliki santri

**Response (400 Bad Request)** jika masih ada santri:
```json
{
  "success": false,
  "message": "Tidak bisa menghapus kamar yang masih memiliki santri. Pindahkan santri terlebih dahulu."
}
```

---

## 4. Absensi

### 4.1 Get Jenis Absensi
**Endpoint**: `GET /api/absensi/jenis`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama": "Absen Malam",
      "deskripsi": "Pengecekan kehadiran santri di kamar pada malam hari"
    },
    {
      "id": 2,
      "nama": "Absen Berjamaah",
      "deskripsi": "Absensi kehadiran sholat berjamaah"
    }
  ]
}
```

---

### 4.2 Submit Absensi (Batch)
**Endpoint**: `POST /api/absensi`

**Akses**: Admin, Pengurus

**Request Body**:
```json
{
  "jenis_absensi_id": 1,
  "tanggal": "2024-01-15",
  "data": [
    {
      "santri_id": 1,
      "status": "HADIR",
      "catatan": null
    },
    {
      "santri_id": 2,
      "status": "SAKIT",
      "catatan": "Demam"
    },
    {
      "santri_id": 3,
      "status": "IZIN",
      "catatan": "Pulang keluarga"
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Berhasil menyimpan absensi untuk 3 santri",
  "data": {
    "tanggal": "2024-01-15",
    "jumlah": 3
  }
}
```

**Status yang tersedia**: `HADIR`, `SAKIT`, `IZIN`, `ALFA`

---

### 4.3 Get Rekap Absensi
**Endpoint**: `GET /api/absensi/rekap`

**Query Parameters** (opsional):
- `bulan`: Filter bulan (format: YYYY-MM, contoh: 2024-01)
- `jenis`: Filter jenis absensi (ID)
- `kamar_id`: Filter berdasarkan kamar

**Contoh**: `GET /api/absensi/rekap?bulan=2024-01&jenis=1&kamar_id=1`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "santri_id": 1,
      "nis": "2024001",
      "nama_santri": "Muhammad Rizki",
      "nomor_kamar": "A1",
      "nama_asrama": "Asrama Putra Al-Fatih",
      "jenis_absensi": "Absen Malam",
      "tanggal": "2024-01-15",
      "status": "HADIR",
      "catatan": null
    }
  ],
  "total": 1
}
```

---

### 4.4 Get Statistik Absensi
**Endpoint**: `GET /api/absensi/statistik`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "hari_ini": [
      {
        "jenis_absensi": "Absen Berjamaah",
        "status": "HADIR",
        "jumlah": 18
      },
      {
        "jenis_absensi": "Absen Berjamaah",
        "status": "SAKIT",
        "jumlah": 2
      }
    ],
    "total_santri": 20,
    "total_kamar": 5,
    "tanggal": "2024-01-15"
  }
}
```

---

### 4.5 Get Absensi Per Kamar
**Endpoint**: `GET /api/absensi/kamar/:kamar_id`

**Query Parameters** (opsional):
- `jenis_absensi_id`: ID jenis absensi
- `tanggal`: Tanggal absensi (default: hari ini)

**Contoh**: `GET /api/absensi/kamar/1?jenis_absensi_id=1&tanggal=2024-01-15`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "kamar": {
      "id": 1,
      "nomor_kamar": "A1",
      "nama_asrama": "Asrama Putra Al-Fatih"
    },
    "tanggal": "2024-01-15",
    "santri": [
      {
        "santri_id": 1,
        "nis": "2024001",
        "nama": "Muhammad Rizki",
        "status_santri": "aktif",
        "status_absen": "HADIR",
        "catatan": ""
      }
    ]
  }
}
```

---

## Error Handling

Semua endpoint mengembalikan response error dengan format:

```json
{
  "success": false,
  "message": "Pesan error yang deskriptif"
}
```

### Kode HTTP yang digunakan:
- **200 OK**: Request berhasil
- **201 Created**: Data berhasil dibuat
- **400 Bad Request**: Request tidak valid (data kurang/salah)
- **401 Unauthorized**: Token tidak ada atau tidak valid
- **403 Forbidden**: Tidak memiliki izin untuk akses
- **404 Not Found**: Data tidak ditemukan
- **500 Internal Server Error**: Error pada server

---

## Testing dengan cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Get Semua Santri (dengan token)
```bash
curl http://localhost:3000/api/santri \
  -H "Authorization: Bearer <token>"
```

### Submit Absensi
```bash
curl -X POST http://localhost:3000/api/absensi \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jenis_absensi_id":1,"data":[{"santri_id":1,"status":"HADIR"}]}'
```
