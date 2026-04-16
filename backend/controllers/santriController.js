// ============================================
// CONTROLLER DATA SANTRI
// ============================================
// Controller ini menangani CRUD (Create, Read, Update, Delete) data santri
// Santri adalah siswa/i di pesantren

const { pool } = require('../config/database');

/**
 * Handler untuk mengambil daftar semua santri
 * Mendukung filter berdasarkan kamar dan pencarian nama
 * 
 * @route GET /api/santri
 * @param {string} req.query.kamar_id - Filter berdasarkan ID kamar (opsional)
 * @param {string} req.query.search - Pencarian berdasarkan nama atau NIS (opsional)
 * @returns {Object} Response dengan array data santri
 */
const getAllSantri = async (req, res) => {
  try {
    const { kamar_id, search } = req.query;

    // Query dasar untuk mengambil data santri dengan join ke tabel kamar
    let query = `
      SELECT s.*, k.nomor_kamar, k.nama_asrama 
      FROM santri s
      LEFT JOIN kamar k ON s.kamar_id = k.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Tambahkan filter kamar_id jika ada
    if (kamar_id) {
      query += ` AND s.kamar_id = $${paramIndex}`;
      params.push(kamar_id);
      paramIndex++;
    }

    // Tambahkan filter pencarian nama atau NIS jika ada
    if (search) {
      query += ` AND (s.nama ILIKE $${paramIndex} OR s.nis ILIKE $${paramIndex})`;
      params.push(`%${search}%`);  // ILIKE dengan % untuk pencarian substring
      paramIndex++;
    }

    // Urutkan berdasarkan nama
    query += ' ORDER BY s.nama ASC';

    // Eksekusi query
    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error mengambil data santri:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data santri'
    });
  }
};

/**
 * Handler untuk mengambil detail satu santri berdasarkan ID
 * 
 * @route GET /api/santri/:id
 * @param {string} req.params.id - ID santri
 * @returns {Object} Response dengan data detail santri
 */
const getSantriById = async (req, res) => {
  try {
    const { id } = req.params;

    // Query dengan join untuk mendapatkan info kamar
    const result = await pool.query(
      `SELECT s.*, k.nomor_kamar, k.nama_asrama 
       FROM santri s
       LEFT JOIN kamar k ON s.kamar_id = k.id
       WHERE s.id = $1`,
      [id]
    );

    // Cek apakah santri ditemukan
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Santri tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error mengambil detail santri:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail santri'
    });
  }
};

/**
 * Handler untuk menambahkan santri baru
 * 
 * @route POST /api/santri
 * @param {Object} req.body - { nis, nama, kamar_id, status }
 * @returns {Object} Response dengan data santri yang baru dibuat
 */
const createSantri = async (req, res) => {
  try {
    const { nis, nama, kamar_id, status } = req.body;

    // Validasi input wajib
    if (!nis || !nama) {
      return res.status(400).json({
        success: false,
        message: 'NIS dan nama santri harus diisi'
      });
    }

    // Cek apakah NIS sudah ada
    const existingNis = await pool.query(
      'SELECT id FROM santri WHERE nis = $1',
      [nis]
    );

    if (existingNis.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'NIS sudah terdaftar'
      });
    }

    // Insert data santri baru
    const result = await pool.query(
      `INSERT INTO santri (nis, nama, kamar_id, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [nis, nama, kamar_id || null, status || 'aktif']
    );

    res.status(201).json({
      success: true,
      message: 'Santri berhasil ditambahkan',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error menambahkan santri:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan santri'
    });
  }
};

/**
 * Handler untuk mengupdate data santri
 * 
 * @route PUT /api/santri/:id
 * @param {string} req.params.id - ID santri yang akan diupdate
 * @param {Object} req.body - Data yang akan diupdate
 * @returns {Object} Response dengan data santri yang sudah diupdate
 */
const updateSantri = async (req, res) => {
  try {
    const { id } = req.params;
    const { nis, nama, kamar_id, status } = req.body;

    // Cek apakah santri ada
    const existing = await pool.query('SELECT id FROM santri WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Santri tidak ditemukan'
      });
    }

    // Update data santri
    const result = await pool.query(
      `UPDATE santri 
       SET nis = COALESCE($1, nis),
           nama = COALESCE($2, nama),
           kamar_id = COALESCE($3, kamar_id),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [nis, nama, kamar_id, status, id]
    );

    res.json({
      success: true,
      message: 'Data santri berhasil diupdate',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error mengupdate santri:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate data santri'
    });
  }
};

/**
 * Handler untuk menghapus santri
 * 
 * @route DELETE /api/santri/:id
 * @param {string} req.params.id - ID santri yang akan dihapus
 * @returns {Object} Response konfirmasi penghapusan
 */
const deleteSantri = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah santri ada
    const existing = await pool.query('SELECT id FROM santri WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Santri tidak ditemukan'
      });
    }

    // Hapus santri dari database
    await pool.query('DELETE FROM santri WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Santri berhasil dihapus'
    });

  } catch (error) {
    console.error('Error menghapus santri:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus santri'
    });
  }
};

// Export semua handler
module.exports = {
  getAllSantri,
  getSantriById,
  createSantri,
  updateSantri,
  deleteSantri
};
