// ============================================
// ROUTES ABSENSI
// ============================================
// File ini mendefinisikan endpoint untuk operasi absensi
// Termasuk submit absensi, rekap, dan statistik

const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const { authenticate, authorize } = require('../middleware/auth');

// Semua route memerlukan login
router.use(authenticate);

/**
 * GET /api/absensi/jenis
 * Mengambil daftar jenis absensi (Malam, Berjamaah, Sakit Pagi, Pengajian)
 * Digunakan untuk menampilkan pilihan di frontend
 */
router.get('/jenis', absensiController.getJenisAbsensi);

/**
 * POST /api/absensi
 * Submit absensi untuk banyak santri sekaligus (batch)
 * Hanya admin dan pengurus yang bisa melakukan absensi
 * Body: { jenis_absensi_id, tanggal, data: [{santri_id, status, catatan}] }
 */
router.post('/', authorize('admin', 'pengurus'), absensiController.submitAbsensi);

/**
 * GET /api/absensi/rekap
 * Mengambil rekap/summary absensi dengan filter
 * Query params: bulan (YYYY-MM), jenis (ID jenis absensi), kamar_id
 * Contoh: /api/absensi/rekap?bulan=2024-01&jenis=1
 */
router.get('/rekap', absensiController.getRekapAbsensi);

/**
 * GET /api/absensi/statistik
 * Mengambil statistik absensi untuk dashboard
 * Menampilkan ringkasan absensi hari ini
 */
router.get('/statistik', absensiController.getStatistikAbsensi);

/**
 * GET /api/absensi/kamar/:kamar_id
 * Mengambil data absensi per kamar untuk tanggal tertentu
 * Digunakan saat pengurus akan melakukan absen di kamar
 * Query params: jenis_absensi_id, tanggal
 */
router.get('/kamar/:kamar_id', absensiController.getAbsensiByKamar);

module.exports = router;
