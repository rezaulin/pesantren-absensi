// ============================================
// MIDDLEWARE AUTENTIKASI JWT
// ============================================
// Middleware ini digunakan untuk melindungi endpoint yang memerlukan login
// JWT (JSON Web Token) digunakan untuk menyimpan informasi user yang login

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Middleware untuk memverifikasi token JWT
 * Token harus dikirim melalui header Authorization dengan format: "Bearer <token>"
 * 
 * @param {Object} req - Request object dari Express
 * @param {Object} res - Response object dari Express  
 * @param {Function} next - Fungsi next untuk melanjutkan ke middleware berikutnya
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Ambil token dari header Authorization
    const authHeader = req.headers.authorization;
    
    // Cek apakah header Authorization ada
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan. Silakan login terlebih dahulu.'
      });
    }

    // 2. Ekstrak token dari format "Bearer <token>"
    // Split berdasarkan spasi, ambil elemen ke-2 (index 1)
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Format token tidak valid. Gunakan format: Bearer <token>'
      });
    }

    // 3. Verifikasi token menggunakan secret key
    // jwt.verify akan throw error jika token tidak valid atau expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Ambil data user dari database untuk memastikan user masih ada
    const userResult = await pool.query(
      'SELECT id, nama, username, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan. Token tidak valid.'
      });
    }

    // 5. Simpan data user ke request object
    // Data ini bisa diakses oleh controller yang membutuhkan info user
    req.user = userResult.rows[0];
    
    // 6. Lanjutkan ke handler berikutnya
    next();
  } catch (error) {
    // Handle berbagai jenis error JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token sudah kadaluarsa. Silakan login kembali.'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid. Silakan login kembali.'
      });
    }
    
    // Error umum lainnya
    console.error('Error pada middleware autentikasi:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.'
    });
  }
};

/**
 * Middleware untuk membatasi akses berdasarkan role
 * Hanya user dengan role tertentu yang bisa mengakses endpoint
 * 
 * @param {...string} roles - Daftar role yang diizinkan (misal: 'admin', 'pengurus')
 * @returns {Function} Middleware function
 * 
 * Contoh penggunaan:
 * router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Cek apakah role user termasuk dalam role yang diizinkan
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role '${req.user.role}' tidak memiliki izin untuk aksi ini.`
      });
    }
    next();
  };
};

// Export middleware untuk digunakan di routes
module.exports = {
  authenticate,
  authorize
};
