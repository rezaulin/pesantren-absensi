// ============================================
// KONFIGURASI DATABASE POSTGRESQL
// ============================================
// File ini mengatur koneksi ke database PostgreSQL
// Menggunakan library 'pg' (node-postgres) untuk koneksi

const { Pool } = require('pg');
require('dotenv').config();

// Membuat pool koneksi database
// Pool digunakan agar koneksi bisa di-reuse untuk efisiensi
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',      // Alamat server database
  port: process.env.DB_PORT || 5432,             // Port PostgreSQL (default 5432)
  database: process.env.DB_NAME || 'pesantren_absensi',  // Nama database
  user: process.env.DB_USER || 'postgres',       // Username database
  password: process.env.DB_PASSWORD || '',       // Password database
  max: 20,                    // Maksimal jumlah koneksi dalam pool
  idleTimeoutMillis: 30000,   // Timeout untuk koneksi idle (30 detik)
  connectionTimeoutMillis: 2000,  // Timeout saat membuat koneksi baru (2 detik)
});

// Event listener untuk error pada pool koneksi
pool.on('error', (err) => {
  console.error('❌ Error pada pool koneksi database:', err);
});

// Fungsi untuk mengecek koneksi database
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Koneksi database PostgreSQL berhasil');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Gagal koneksi ke database:', err.message);
    return false;
  }
};

// Export pool dan fungsi test untuk digunakan di file lain
module.exports = {
  pool,
  testConnection,
  // Helper untuk query dengan parameter
  // Contoh: query('SELECT * FROM users WHERE id = $1', [userId])
  query: (text, params) => pool.query(text, params),
};
