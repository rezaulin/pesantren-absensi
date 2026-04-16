// ============================================
// SERVER UTAMA - SISTEM ABSENSI PESANTREN
// ============================================
// File ini adalah entry point aplikasi backend
// Mengatur Express server, middleware, dan routes

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import konfigurasi database
const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const santriRoutes = require('./routes/santriRoutes');
const kamarRoutes = require('./routes/kamarRoutes');
const absensiRoutes = require('./routes/absensiRoutes');

// Inisialisasi Express application
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Mengizinkan request dari frontend
// Berguna saat frontend dan backend di domain/port berbeda
app.use(cors());

// Body Parser - Membaca JSON dari request body
app.use(express.json());

// Body Parser - Membaca URL-encoded data (untuk form)
app.use(express.urlencoded({ extended: true }));

// Static Files - Menyajikan file statis dari folder frontend
// Ini memungkinkan frontend diakses langsung dari backend
app.use(express.static(path.join(__dirname, '../frontend')));

// Request Logger - Mencatat setiap request untuk debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ============================================
// API ROUTES
// ============================================
// Semua endpoint API dimulai dengan /api

// Routes untuk autentikasi (login, register)
app.use('/api/auth', authRoutes);

// Routes untuk data santri (CRUD)
app.use('/api/santri', santriRoutes);

// Routes untuk data kamar (CRUD)
app.use('/api/kamar', kamarRoutes);

// Routes untuk absensi (submit, rekap, statistik)
app.use('/api/absensi', absensiRoutes);

// ============================================
// ROUTE UNTUK FRONTEND
// ============================================
// Semua route selain /api akan diarahkan ke frontend (SPA support)
// Ini berguna jika menggunakan Single Page Application framework

app.get('*', (req, res) => {
  // Jika bukan route API, kirim file index.html
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// ============================================
// ERROR HANDLER
// ============================================
// Middleware untuk menangani error yang tidak tertangkap

app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

// Fungsi untuk menjalankan server
const startServer = async () => {
  // 1. Cek koneksi database terlebih dahulu
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('❌ Server gagal dimulai: Database tidak terhubung');
    console.log('💡 Pastikan PostgreSQL sudah berjalan dan konfigurasi .env sudah benar');
    process.exit(1);
  }

  // 2. Jalankan server
  app.listen(PORT, () => {
    console.log('');
    console.log('============================================');
    console.log('🕌 SISTEM ABSENSI PESANTREN');
    console.log('============================================');
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
    console.log(`📁 Frontend: http://localhost:${PORT}/index.html`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
    console.log('============================================');
    console.log('');
  });
};

// Jalankan server
startServer();
