// ============================================
// ROUTES DATA KAMAR
// ============================================
// File ini mendefinisikan endpoint untuk CRUD data kamar asrama
// Semua endpoint memerlukan autentikasi

const express = require('express');
const router = express.Router();
const kamarController = require('../controllers/kamarController');
const { authenticate, authorize } = require('../middleware/auth');

// Semua route memerlukan login
router.use(authenticate);

/**
 * GET /api/kamar
 * Mengambil daftar semua kamar dengan jumlah santri
 */
router.get('/', kamarController.getAllKamar);

/**
 * GET /api/kamar/:id
 * Mengambil detail kamar beserta daftar santri di dalamnya
 */
router.get('/:id', kamarController.getKamarById);

/**
 * POST /api/kamar
 * Menambahkan kamar baru
 * Hanya admin yang bisa menambah kamar
 * Body: { nomor_kamar, nama_asrama, kapasitas }
 */
router.post('/', authorize('admin'), kamarController.createKamar);

/**
 * PUT /api/kamar/:id
 * Mengupdate data kamar
 * Hanya admin yang bisa update
 */
router.put('/:id', authorize('admin'), kamarController.updateKamar);

/**
 * DELETE /api/kamar/:id
 * Menghapus kamar
 * Hanya admin yang bisa menghapus
 * Tidak bisa menghapus kamar yang masih memiliki santri
 */
router.delete('/:id', authorize('admin'), kamarController.deleteKamar);

module.exports = router;
