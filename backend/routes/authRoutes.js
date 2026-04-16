// ============================================
// ROUTES AUTENTIKASI
// ============================================
// File ini mendefinisikan endpoint untuk autentikasi (login, register, dll)
// Semua route terkait auth ada di sini

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Endpoint untuk login user
 * Body: { username, password }
 * Response: { token, user }
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/register
 * Endpoint untuk registrasi user baru
 * Hanya admin yang bisa register user baru
 * Body: { nama, username, password, role }
 */
router.post('/register', authenticate, authorize('admin'), authController.register);

/**
 * GET /api/auth/me
 * Endpoint untuk mendapatkan data user yang sedang login
 * Memerlukan token JWT di header Authorization
 */
router.get('/me', authenticate, authController.getMe);

module.exports = router;
