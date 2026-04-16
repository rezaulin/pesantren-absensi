// ============================================
// ROUTES DATA SANTRI
// ============================================
// File ini mendefinisikan endpoint untuk CRUD data santri
// Semua endpoint memerlukan autentikasi

const express = require('express');
const router = express.Router();
const santriController = require('../controllers/santriController');
const { authenticate, authorize } = require('../middleware/auth');

// Semua route di bawah ini memerlukan login (autentikasi)
router.use(authenticate);

/**
 * GET /api/santri
 * Mengambil daftar semua santri
 * Query params: kamar_id, search
 */
router.get('/', santriController.getAllSantri);

/**
 * GET /api/santri/:id
 * Mengambil detail satu santri berdasarkan ID
 */
router.get('/:id', santriController.getSantriById);

/**
 * POST /api/santri
 * Menambahkan santri baru
 * Hanya admin dan pengurus yang bisa menambah
 * Body: { nis, nama, kamar_id, status }
 */
router.post('/', authorize('admin', 'pengurus'), santriController.createSantri);

/**
 * PUT /api/santri/:id
 * Mengupdate data santri
 * Hanya admin dan pengurus yang bisa update
 */
router.put('/:id', authorize('admin', 'pengurus'), santriController.updateSantri);

/**
 * DELETE /api/santri/:id
 * Menghapus santri
 * Hanya admin yang bisa menghapus
 */
router.delete('/:id', authorize('admin'), santriController.deleteSantri);

module.exports = router;
