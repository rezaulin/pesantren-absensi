// ============================================
// CONTROLLER AUTENTIKASI (LOGIN/LOGOUT)
// ============================================
// Controller ini menangani proses login, logout, dan registrasi user
// Menggunakan bcrypt untuk hash password dan JWT untuk token

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Handler untuk login user
 * Menerima username dan password, mengembalikan JWT token jika berhasil
 * 
 * @route POST /api/auth/login
 * @param {Object} req.body - { username, password }
 * @returns {Object} Response dengan token JWT dan data user
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Validasi input - pastikan username dan password diisi
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password harus diisi'
      });
    }

    // 2. Cari user di database berdasarkan username
    const userResult = await pool.query(
      'SELECT id, nama, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    // 3. Cek apakah user ditemukan
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    const user = userResult.rows[0];

    // 4. Verifikasi password menggunakan bcrypt
    // bcrypt.compare akan membandingkan password plaintext dengan hash di database
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    // 5. Buat JWT token dengan payload berisi userId dan role
    const token = jwt.sign(
      { 
        userId: user.id,      // ID user untuk identifikasi
        role: user.role        // Role untuk otorisasi
      },
      process.env.JWT_SECRET,  // Secret key dari environment
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }  // Token berlaku 24 jam
    );

    // 6. Kirim response berhasil dengan token dan data user
    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          nama: user.nama,
          username: user.username,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Error pada login:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
};

/**
 * Handler untuk registrasi user baru
 * Hanya admin yang bisa menambahkan user baru
 * 
 * @route POST /api/auth/register
 * @param {Object} req.body - { nama, username, password, role }
 * @returns {Object} Response dengan data user baru
 */
const register = async (req, res) => {
  try {
    const { nama, username, password, role } = req.body;

    // 1. Validasi input
    if (!nama || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, username, dan password harus diisi'
      });
    }

    // 2. Cek apakah username sudah digunakan
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username sudah digunakan'
      });
    }

    // 3. Hash password menggunakan bcrypt
    // Angka 10 adalah salt rounds - semakin tinggi semakin aman tapi lebih lambat
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert user baru ke database
    const newUserResult = await pool.query(
      `INSERT INTO users (nama, username, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, nama, username, role, created_at`,
      [nama, username, hashedPassword, role || 'pengurus']
    );

    // 5. Kirim response berhasil
    res.status(201).json({
      success: true,
      message: 'User berhasil didaftarkan',
      data: newUserResult.rows[0]
    });

  } catch (error) {
    console.error('Error pada register:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
};

/**
 * Handler untuk mendapatkan data user yang sedang login
 * Berguna untuk mengambil profil user saat aplikasi dimuat
 * 
 * @route GET /api/auth/me
 * @returns {Object} Response dengan data user
 */
const getMe = async (req, res) => {
  try {
    // req.user diisi oleh middleware authenticate
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Error pada getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
};

// Export semua handler untuk digunakan di routes
module.exports = {
  login,
  register,
  getMe
};
