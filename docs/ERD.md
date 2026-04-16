# Entity Relationship Diagram (ERD) - Sistem Absensi Pesantren

## Diagram Relasi Antar Tabel

```
+------------------+       +------------------+       +------------------+
|      users       |       |      kamar       |       |      santri      |
+------------------+       +------------------+       +------------------+
| id (PK)          |       | id (PK)          |       | id (PK)          |
| nama             |       | nomor_kamar      |       | nis (UNIQUE)     |
| username (UNIQUE)|       | nama_asrama      |       | nama             |
| password_hash    |       | kapasitas        |<------| kamar_id (FK)    |
| role             |       | created_at       |       | status           |
| created_at       |       | updated_at       |       | foto             |
| updated_at       |       +------------------+       | created_at       |
+------------------+                                  | updated_at       |
       |                                              +------------------+
       |                                                     |
       |                                                     |
       | pengurus_id (FK)                                    | santri_id (FK)
       |                                                     |
       v                                                     v
+------------------+       +------------------+       +------------------+
|  jenis_absensi   |       |   log_absensi    |       |                  |
+------------------+       +------------------+       +------------------+
| id (PK)          |<------| jenis_absensi_id |       |                  |
| nama             |       | id (PK)          |       |                  |
| deskripsi        |       | santri_id (FK)   |       |                  |
| created_at       |       | tanggal          |       |                  |
+------------------+       | status           |       |                  |
                           | catatan          |       |                  |
                           | pengurus_id (FK) |       |                  |
                           | created_at       |       |                  |
                           +------------------+       +------------------+
```

## Penjelasan Relasi Antar Tabel

### 1. users (Tabel Pengguna)
- **Fungsi**: Menyimpan data pengguna sistem (admin dan pengurus)
- **Relasi**: 
  - Satu pengurus bisa memiliki banyak catatan di `log_absensi` (One-to-Many)
  - Kolom `pengurus_id` di `log_absensi` merujuk ke `users.id`

### 2. kamar (Tabel Kamar Asrama)
- **Fungsi**: Menyimpan data kamar asrama pesantren
- **Relasi**:
  - Satu kamar bisa dihuni banyak santri (One-to-Many)
  - Kolom `kamar_id` di `santri` merujuk ke `kamar.id`
  - Jika kamar dihapus, `kamar_id` di santri menjadi NULL (ON DELETE SET NULL)

### 3. santri (Tabel Santri)
- **Fungsi**: Menyimpan data santri (siswa pesantren)
- **Relasi**:
  - Setiap santri tinggal di satu kamar (Many-to-One dengan `kamar`)
  - Satu santri bisa memiliki banyak catatan absensi (One-to-Many dengan `log_absensi`)
  - Jika santri dihapus, semua catatan absensinya ikut terhapus (ON DELETE CASCADE)

### 4. jenis_absensi (Tabel Jenis Absensi)
- **Fungsi**: Menyimpan jenis-jenis absensi yang tersedia
- **Data**: Absen Malam, Berjamaah, Sakit Pagi, Pengajian, Rekap Asrama
- **Relasi**:
  - Satu jenis absensi bisa memiliki banyak log (One-to-Many dengan `log_absensi`)

### 5. log_absensi (Tabel Log Absensi) - TABEL UTAMA
- **Fungsi**: Menyimpan catatan setiap absensi santri
- **Relasi**:
  - Banyak-to-One dengan `santri` (siapa yang diabsen)
  - Banyak-to-One dengan `jenis_absensi` (jenis absensi apa)
  - Banyak-to-One dengan `users` (siapa yang melakukan absen)
- **Constraint**:
  - `status` harus bernilai: HADIR, SAKIT, IZIN, atau ALFA

## Tipe Relasi

```
users (1) -----> (N) log_absensi
    Satu pengurus bisa mencatat banyak absensi

kamar (1) -----> (N) santri
    Satu kamar bisa dihuni banyak santri

santri (1) -----> (N) log_absensi
    Satu santri bisa memiliki banyak catatan absensi

jenis_absensi (1) -----> (N) log_absensi
    Satu jenis absensi bisa memiliki banyak catatan
```

## Keterangan Singkatan
- **PK**: Primary Key (kunci utama)
- **FK**: Foreign Key (kunci asing)
- **UNIQUE**: Nilai harus unik
- **NOT NULL**: Tidak boleh kosong
- **1:1**: One-to-One (satu ke satu)
- **1:N**: One-to-Many (satu ke banyak)
- **N:1**: Many-to-One (banyak ke satu)
