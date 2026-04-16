// ============================================
// DATABASE MIGRATION - MEMBUAT SCHEMA DATABASE
// ============================================
// File ini membuat semua tabel yang dibutuhkan oleh aplikasi
// Jalankan dengan: node database/migrate.js

const { pool } = require('../config/database');

// SQL untuk membuat semua tabel
// Setiap tabel memiliki kolom created_at untuk audit trail
const createTables = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Memulai migrasi database...');

    // Mulai transaksi - semua berhasil atau tidak sama sekali
    await client.query('BEGIN');

    // ============================================
    // TABEL: users
    // Menyimpan data pengguna sistem (admin, pengurus)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,                    -- ID unik user (auto increment)
        nama VARCHAR(100) NOT NULL,               -- Nama lengkap user
        username VARCHAR(50) UNIQUE NOT NULL,     -- Username untuk login (harus unik)
        password_hash VARCHAR(255) NOT NULL,      -- Password dalam bentuk hash (bukan plaintext!)
        role VARCHAR(20) DEFAULT 'pengurus',      -- Role: 'admin' atau 'pengurus'
        created_at TIMESTAMP DEFAULT NOW(),       -- Waktu pembuatan akun
        updated_at TIMESTAMP DEFAULT NOW()        -- Waktu update terakhir
      );
    `);
    console.log('  ✅ Tabel users berhasil dibuat');

    // ============================================
    // TABEL: kamar
    // Menyimpan data kamar asrama pesantren
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS kamar (
        id SERIAL PRIMARY KEY,                    -- ID unik kamar
        nomor_kamar VARCHAR(20) NOT NULL,         -- Nomor/identitas kamar (contoh: A1, B2)
        nama_asrama VARCHAR(100) NOT NULL,        -- Nama asrama (contoh: Asrama Putra)
        kapasitas INTEGER DEFAULT 10,             -- Kapasitas maksimal santri
        created_at TIMESTAMP DEFAULT NOW(),       -- Waktu pembuatan
        updated_at TIMESTAMP DEFAULT NOW()        -- Waktu update terakhir
      );
    `);
    console.log('  ✅ Tabel kamar berhasil dibuat');

    // ============================================
    // TABEL: santri
    // Menyimpan data santri (siswa pesantren)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS santri (
        id SERIAL PRIMARY KEY,                    -- ID unik santri
        nis VARCHAR(20) UNIQUE NOT NULL,          -- Nomor Induk Santri (harus unik)
        nama VARCHAR(100) NOT NULL,               -- Nama lengkap santri
        kamar_id INTEGER REFERENCES kamar(id) ON DELETE SET NULL,  -- FK ke tabel kamar
        status VARCHAR(20) DEFAULT 'aktif',       -- Status: 'aktif', 'nonaktif', 'lulus'
        foto VARCHAR(255),                        -- Path foto santri (opsional)
        created_at TIMESTAMP DEFAULT NOW(),       -- Waktu data dibuat
        updated_at TIMESTAMP DEFAULT NOW()        -- Waktu update terakhir
      );
    `);
    console.log('  ✅ Tabel santri berhasil dibuat');

    // ============================================
    // TABEL: jenis_absensi
    // Menyimpan jenis-jenis absensi yang tersedia
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS jenis_absensi (
        id SERIAL PRIMARY KEY,                    -- ID unik jenis absensi
        nama VARCHAR(50) NOT NULL,                -- Nama jenis (contoh: Absen Malam)
        deskripsi TEXT,                           -- Penjelasan detail jenis absensi
        created_at TIMESTAMP DEFAULT NOW()        -- Waktu pembuatan
      );
    `);
    console.log('  ✅ Tabel jenis_absensi berhasil dibuat');

    // ============================================
    // TABEL: log_absensi
    // Menyimpan catatan/riwayat setiap absensi
    // Ini adalah tabel utama untuk tracking kehadiran santri
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS log_absensi (
        id SERIAL PRIMARY KEY,                    -- ID unik log absensi
        santri_id INTEGER REFERENCES santri(id) ON DELETE CASCADE,      -- FK ke santri
        jenis_absensi_id INTEGER REFERENCES jenis_absensi(id),          -- FK ke jenis absensi
        tanggal DATE NOT NULL,                    -- Tanggal absensi
        status VARCHAR(10) NOT NULL,              -- Status: HADIR, SAKIT, IZIN, ALFA
        catatan TEXT,                             -- Catatan tambahan (misal: keterangan sakit)
        pengurus_id INTEGER REFERENCES users(id), -- FK ke pengurus yang melakukan absen
        created_at TIMESTAMP DEFAULT NOW(),       -- Waktu pencatatan
        CONSTRAINT valid_status CHECK (status IN ('HADIR', 'SAKIT', 'IZIN', 'ALFA'))
      );
    `);
    console.log('  ✅ Tabel log_absensi berhasil dibuat');

    // ============================================
    // INDEX untuk performa query
    // Index mempercepat pencarian data pada kolom yang sering digunakan
    // ============================================
    
    // Index untuk pencarian santri berdasarkan nama
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_santri_nama ON santri(nama);
    `);

    // Index untuk filter absensi berdasarkan tanggal
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_log_absensi_tanggal ON log_absensi(tanggal);
    `);

    // Index untuk filter absensi berdasarkan santri
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_log_absensi_santri ON log_absensi(santri_id);
    `);

    // Index komposit untuk query rekap absensi
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_log_absensi_jenis_tanggal 
      ON log_absensi(jenis_absensi_id, tanggal);
    `);

    console.log('  ✅ Index berhasil dibuat');

    // Commit transaksi - simpan semua perubahan
    await client.query('COMMIT');
    console.log('');
    console.log('🎉 Migrasi database berhasil diselesaikan!');

  } catch (error) {
    // Rollback jika terjadi error
    await client.query('ROLLBACK');
    console.error('❌ Error saat migrasi:', error);
    throw error;
  } finally {
    // Selalu release koneksi
    client.release();
    await pool.end();
  }
};

// Jalankan migrasi
createTables();
