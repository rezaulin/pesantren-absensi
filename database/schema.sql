-- ============================================
-- SCHEMA DATABASE - SISTEM ABSENSI PESANTREN
-- ============================================
-- File ini berisi definisi semua tabel dalam database
-- Gunakan file ini untuk membuat struktur database dari awal
-- Cara menjalankan: psql -U postgres -d pesantren_absensi -f schema.sql

-- ============================================
-- TABEL: users
-- Menyimpan data pengguna sistem (admin dan pengurus)
-- Setiap pengguna memiliki role yang menentukan hak akses
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,                    -- ID unik user, auto increment
    nama VARCHAR(100) NOT NULL,               -- Nama lengkap pengguna
    username VARCHAR(50) UNIQUE NOT NULL,     -- Username untuk login, harus unik
    password_hash VARCHAR(255) NOT NULL,      -- Password dalam bentuk hash (bcrypt)
    role VARCHAR(20) DEFAULT 'pengurus',      -- Role user: 'admin' atau 'pengurus'
    created_at TIMESTAMP DEFAULT NOW(),       -- Waktu pembuatan akun
    updated_at TIMESTAMP DEFAULT NOW()        -- Waktu update terakhir
);

-- Komentar untuk tabel users
COMMENT ON TABLE users IS 'Tabel menyimpan data pengguna sistem (admin dan pengurus pesantren)';
COMMENT ON COLUMN users.id IS 'Primary key, ID unik pengguna';
COMMENT ON COLUMN users.nama IS 'Nama lengkap pengguna';
COMMENT ON COLUMN users.username IS 'Username untuk login, harus unik';
COMMENT ON COLUMN users.password_hash IS 'Password yang sudah di-hash menggunakan bcrypt';
COMMENT ON COLUMN users.role IS 'Role pengguna: admin (akses penuh) atau pengurus (akses terbatas)';

-- ============================================
-- TABEL: kamar
-- Menyimpan data kamar asrama pesantren
-- Setiap kamar memiliki kapasitas dan termasuk dalam asrama tertentu
-- ============================================
CREATE TABLE IF NOT EXISTS kamar (
    id SERIAL PRIMARY KEY,                    -- ID unik kamar, auto increment
    nomor_kamar VARCHAR(20) NOT NULL,         -- Nomor/identitas kamar (contoh: A1, B2, C3)
    nama_asrama VARCHAR(100) NOT NULL,        -- Nama asrama tempat kamar berada
    kapasitas INTEGER DEFAULT 10,             -- Kapasitas maksimal santri dalam kamar
    created_at TIMESTAMP DEFAULT NOW(),       -- Waktu pembuatan data
    updated_at TIMESTAMP DEFAULT NOW()        -- Waktu update terakhir
);

-- Komentar untuk tabel kamar
COMMENT ON TABLE kamar IS 'Tabel menyimpan data kamar asrama pesantren';
COMMENT ON COLUMN kamar.id IS 'Primary key, ID unik kamar';
COMMENT ON COLUMN kamar.nomor_kamar IS 'Nomor atau identitas kamar (misal: A1, B2)';
COMMENT ON COLUMN kamar.nama_asrama IS 'Nama asrama tempat kamar berada (misal: Asrama Putra)';
COMMENT ON COLUMN kamar.kapasitas IS 'Kapasitas maksimal santri yang bisa menghuni kamar';

-- ============================================
-- TABEL: santri
-- Menyimpan data santri (siswa pesantren)
-- Setiap santri terdaftar dalam satu kamar
-- ============================================
CREATE TABLE IF NOT EXISTS santri (
    id SERIAL PRIMARY KEY,                    -- ID unik santri, auto increment
    nis VARCHAR(20) UNIQUE NOT NULL,          -- Nomor Induk Santri, harus unik
    nama VARCHAR(100) NOT NULL,               -- Nama lengkap santri
    kamar_id INTEGER REFERENCES kamar(id) ON DELETE SET NULL,  -- Foreign key ke tabel kamar
    status VARCHAR(20) DEFAULT 'aktif',       -- Status santri: 'aktif', 'nonaktif', 'lulus'
    foto VARCHAR(255),                        -- Path/URL foto santri (opsional)
    created_at TIMESTAMP DEFAULT NOW(),       -- Waktu data dibuat
    updated_at TIMESTAMP DEFAULT NOW()        -- Waktu update terakhir
);

-- Komentar untuk tabel santri
COMMENT ON TABLE santri IS 'Tabel menyimpan data santri (siswa/i pesantren)';
COMMENT ON COLUMN santri.id IS 'Primary key, ID unik santri';
COMMENT ON COLUMN santri.nis IS 'Nomor Induk Santri, identifier unik untuk setiap santri';
COMMENT ON COLUMN santri.nama IS 'Nama lengkap santri';
COMMENT ON COLUMN santri.kamar_id IS 'Foreign key ke tabel kamar, menunjukkan santri menghuni kamar mana';
COMMENT ON COLUMN santri.status IS 'Status santri: aktif (sedang mondok), nonaktif (keluar), lulus (sudah lulus)';

-- ============================================
-- TABEL: jenis_absensi
-- Menyimpan jenis-jenis absensi yang tersedia
-- Contoh: Absen Malam, Absen Berjamaah, dll
-- ============================================
CREATE TABLE IF NOT EXISTS jenis_absensi (
    id SERIAL PRIMARY KEY,                    -- ID unik jenis absensi
    nama VARCHAR(50) NOT NULL,                -- Nama jenis absensi
    deskripsi TEXT,                           -- Penjelasan detail tentang jenis absensi
    created_at TIMESTAMP DEFAULT NOW()        -- Waktu pembuatan data
);

-- Komentar untuk tabel jenis_absensi
COMMENT ON TABLE jenis_absensi IS 'Tabel menyimpan jenis-jenis absensi yang tersedia di pesantren';
COMMENT ON COLUMN jenis_absensi.id IS 'Primary key, ID unik jenis absensi';
COMMENT ON COLUMN jenis_absensi.nama IS 'Nama jenis absensi (misal: Absen Malam, Berjamaah)';
COMMENT ON COLUMN jenis_absensi.deskripsi IS 'Penjelasan detail tentang jenis absensi ini';

-- ============================================
-- TABEL: log_absensi
-- Menyimpan catatan/riwayat setiap absensi
-- Ini adalah tabel utama untuk tracking kehadiran santri
-- Setiap baris merepresentasikan satu santri di satu absensi
-- ============================================
CREATE TABLE IF NOT EXISTS log_absensi (
    id SERIAL PRIMARY KEY,                    -- ID unik log absensi
    santri_id INTEGER REFERENCES santri(id) ON DELETE CASCADE,      -- FK ke tabel santri
    jenis_absensi_id INTEGER REFERENCES jenis_absensi(id),          -- FK ke tabel jenis_absensi
    tanggal DATE NOT NULL,                    -- Tanggal dilakukannya absensi
    status VARCHAR(10) NOT NULL,              -- Status kehadiran: HADIR, SAKIT, IZIN, ALFA
    catatan TEXT,                             -- Catatan tambahan (misal: keterangan sakit)
    pengurus_id INTEGER REFERENCES users(id), -- FK ke pengurus yang melakukan absen
    created_at TIMESTAMP DEFAULT NOW(),       -- Waktu pencatatan absensi
    CONSTRAINT valid_status CHECK (status IN ('HADIR', 'SAKIT', 'IZIN', 'ALFA'))
);

-- Komentar untuk tabel log_absensi
COMMENT ON TABLE log_absensi IS 'Tabel utama untuk mencatat riwayat absensi santri';
COMMENT ON COLUMN log_absensi.id IS 'Primary key, ID unik setiap catatan absensi';
COMMENT ON COLUMN log_absensi.santri_id IS 'Foreign key ke tabel santri, menunjukkan siapa yang diabsen';
COMMENT ON COLUMN log_absensi.jenis_absensi_id IS 'Foreign key ke jenis_absensi, menunjukkan jenis absensi apa';
COMMENT ON COLUMN log_absensi.tanggal IS 'Tanggal dilakukannya absensi';
COMMENT ON COLUMN log_absensi.status IS 'Status kehadiran: HADIR, SAKIT, IZIN, atau ALFA';
COMMENT ON COLUMN log_absensi.catatan IS 'Catatan tambahan, misal keterangan jika sakit atau izin';
COMMENT ON COLUMN log_absensi.pengurus_id IS 'Foreign key ke users, menunjukkan siapa yang melakukan absen';

-- ============================================
-- INDEX untuk meningkatkan performa query
-- Index mempercepat pencarian data pada kolom yang sering di-query
-- ============================================

-- Index untuk pencarian santri berdasarkan nama
CREATE INDEX IF NOT EXISTS idx_santri_nama ON santri(nama);

-- Index untuk filter absensi berdasarkan tanggal
CREATE INDEX IF NOT EXISTS idx_log_absensi_tanggal ON log_absensi(tanggal);

-- Index untuk filter absensi berdasarkan santri
CREATE INDEX IF NOT EXISTS idx_log_absensi_santri ON log_absensi(santri_id);

-- Index komposit untuk query rekap absensi (filter by jenis dan tanggal)
CREATE INDEX IF NOT EXISTS idx_log_absensi_jenis_tanggal 
ON log_absensi(jenis_absensi_id, tanggal);

-- Index untuk pencarian kamar berdasarkan asrama
CREATE INDEX IF NOT EXISTS idx_kamar_asrama ON kamar(nama_asrama);
