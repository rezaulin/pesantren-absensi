// ============================================
// CONTROLLER DATA KAMAR
// ============================================
// Controller ini menangani CRUD data kamar asrama pesantren
// Setiap kamar memiliki kapasitas dan termasuk dalam asrama tertentu

const { pool } = require('../config/database');

/**
 * Handler untuk mengambil daftar semua kamar
 * Termasuk jumlah santri di setiap kamar
 * 
 * @route GET /api/kamar
 * @returns {Object} Response dengan array data kamar
 */
const getAllKamar = async (req, res) => {
  try {
    // Query dengan LEFT JOIN dan COUNT untuk menghitung jumlah santri per kamar
    const result = await pool.query(`
      SELECT 
        k.*,
        COUNT(s.id) as jumlah_santri
      FROM kamar k
      LEFT JOIN santri s ON s.kamar_id = k.id
      GROUP BY k.id
      ORDER BY k.nama_asrama, k.nomor_kamar
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error mengambil data kamar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kamar'
    });
  }
};

/**
 * Handler untuk mengambil detail satu kamar
 * Termasuk daftar santri di kamar tersebut
 * 
 * @route GET /api/kamar/:id
 * @param {string} req.params.id - ID kamar
 * @returns {Object} Response dengan data kamar dan daftar santri
 */
const getKamarById = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil data kamar
    const kamarResult = await pool.query(
      'SELECT * FROM kamar WHERE id = $1',
      [id]
    );

    if (kamarResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kamar tidak ditemukan'
      });
    }

    // Ambil daftar santri di kamar ini
    const santriResult = await pool.query(
      'SELECT id, nis, nama, status FROM santri WHERE kamar_id = $1 ORDER BY nama',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...kamarResult.rows[0],
        santri: santriResult.rows
      }
    });

  } catch (error) {
    console.error('Error mengambil detail kamar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail kamar'
    });
  }
};

/**
 * Handler untuk menambahkan kamar baru
 * 
 * @route POST /api/kamar
 * @param {Object} req.body - { nomor_kamar, nama_asrama, kapasitas }
 * @returns {Object} Response dengan data kamar yang baru dibuat
 */
const createKamar = async (req, res) => {
  try {
    const { nomor_kamar, nama_asrama, kapasitas } = req.body;

    // Validasi input
    if (!nomor_kamar || !nama_asrama) {
      return res.status(400).json({
        success: false,
        message: 'Nomor kamar dan nama asrama harus diisi'
      });
    }

    // Insert kamar baru
    const result = await pool.query(
      `INSERT INTO kamar (nomor_kamar, nama_asrama, kapasitas) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [nomor_kamar, nama_asrama, kapasitas || 10]
    );

    res.status(201).json({
      success: true,
      message: 'Kamar berhasil ditambahkan',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error menambahkan kamar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan kamar'
    });
  }
};

/**
 * Handler untuk mengupdate data kamar
 * 
 * @route PUT /api/kamar/:id
 * @param {string} req.params.id - ID kamar yang akan diupdate
 * @param {Object} req.body - Data yang akan diupdate
 * @returns {Object} Response dengan data kamar yang sudah diupdate
 */
const updateKamar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nomor_kamar, nama_asrama, kapasitas } = req.body;

    // Cek apakah kamar ada
    const existing = await pool.query('SELECT id FROM kamar WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kamar tidak ditemukan'
      });
    }

    // Update data kamar
    const result = await pool.query(
      `UPDATE kamar 
       SET nomor_kamar = COALESCE($1, nomor_kamar),
           nama_asrama = COALESCE($2, nama_asrama),
           kapasitas = COALESCE($3, kapasitas),
           updated_at = NOW()
       WHERE id = $4 
       RETURNING *`,
      [nomor_kamar, nama_asrama, kapasitas, id]
    );

    res.json({
      success: true,
      message: 'Data kamar berhasil diupdate',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error mengupdate kamar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate data kamar'
    });
  }
};

/**
 * Handler untuk menghapus kamar
 * 
 * @route DELETE /api/kamar/:id
 * @param {string} req.params.id - ID kamar yang akan dihapus
 * @returns {Object} Response konfirmasi penghapusan
 */
const deleteKamar = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah kamar ada
    const existing = await pool.query('SELECT id FROM kamar WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kamar tidak ditemukan'
      });
    }

    // Cek apakah masih ada santri di kamar ini
    const santriCount = await pool.query(
      'SELECT COUNT(*) as count FROM santri WHERE kamar_id = $1',
      [id]
    );

    if (parseInt(santriCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa menghapus kamar yang masih memiliki santri. Pindahkan santri terlebih dahulu.'
      });
    }

    // Hapus kamar
    await pool.query('DELETE FROM kamar WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Kamar berhasil dihapus'
    });

  } catch (error) {
    console.error('Error menghapus kamar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus kamar'
    });
  }
};

// Export semua handler
module.exports = {
  getAllKamar,
  getKamarById,
  createKamar,
  updateKamar,
  deleteKamar
};
