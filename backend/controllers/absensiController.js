// ============================================
// CONTROLLER ABSENSI
// ============================================
// Controller ini menangani semua operasi absensi santri
// Mendukung 5 jenis absensi: Malam, Berjamaah, Sakit Pagi, Pengajian, dan Rekap

const { pool } = require('../config/database');

/**
 * Handler untuk mengambil daftar jenis absensi
 * Berguna untuk menampilkan pilihan jenis absensi di frontend
 * 
 * @route GET /api/absensi/jenis
 * @returns {Object} Response dengan array jenis absensi
 */
const getJenisAbsensi = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM jenis_absensi ORDER BY id'
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error mengambil jenis absensi:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil jenis absensi'
    });
  }
};

/**
 * Handler untuk submit absensi batch (banyak santri sekaligus)
 * Digunakan ketika pengurus melakukan absen di kamar
 * 
 * @route POST /api/absensi
 * @param {Object} req.body - { jenis_absensi_id, tanggal, data: [{santri_id, status, catatan}] }
 * @returns {Object} Response konfirmasi berhasil
 */
const submitAbsensi = async (req, res) => {
  // Mulai transaksi database untuk memastikan semua data masuk atau tidak sama sekali
  const client = await pool.connect();

  try {
    const { jenis_absensi_id, tanggal, data } = req.body;
    const pengurus_id = req.user.id;  // ID pengurus yang login

    // Validasi input
    if (!jenis_absensi_id || !data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Data absensi tidak valid. Jenis absensi dan data santri harus diisi.'
      });
    }

    // Mulai transaksi
    await client.query('BEGIN');

    // Gunakan tanggal yang diberikan atau tanggal hari ini
    const absenTanggal = tanggal || new Date().toISOString().split('T')[0];

    // Hapus absensi sebelumnya untuk jenis dan tanggal yang sama (jika ada)
    // Ini memungkinkan pengurus mengubah absensi yang sudah ada
    await client.query(
      `DELETE FROM log_absensi 
       WHERE jenis_absensi_id = $1 
       AND tanggal = $2 
       AND pengurus_id = $3
       AND santri_id = ANY($4)`,
      [jenis_absensi_id, absenTanggal, pengurus_id, data.map(d => d.santri_id)]
    );

    // Insert semua data absensi sekaligus menggunakan query batch
    const insertPromises = data.map(item => {
      return client.query(
        `INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, catatan, pengurus_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.santri_id, jenis_absensi_id, absenTanggal, item.status, item.catatan || null, pengurus_id]
      );
    });

    // Tunggu semua insert selesai
    await Promise.all(insertPromises);

    // Commit transaksi - simpan semua perubahan
    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Berhasil menyimpan absensi untuk ${data.length} santri`,
      data: {
        tanggal: absenTanggal,
        jumlah: data.length
      }
    });

  } catch (error) {
    // Rollback transaksi jika terjadi error
    await client.query('ROLLBACK');
    console.error('Error submit absensi:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan absensi'
    });
  } finally {
    // Selalu release client kembali ke pool
    client.release();
  }
};

/**
 * Handler untuk mengambil rekap absensi
 * Mendukung filter berdasarkan bulan, jenis absensi, dan kamar
 * 
 * @route GET /api/absensi/rekap
 * @param {string} req.query.bulan - Bulan dalam format YYYY-MM (contoh: 2024-01)
 * @param {string} req.query.jenis - ID jenis absensi (opsional)
 * @param {string} req.query.kamar_id - ID kamar untuk filter (opsional)
 * @returns {Object} Response dengan data rekap absensi
 */
const getRekapAbsensi = async (req, res) => {
  try {
    const { bulan, jenis, kamar_id } = req.query;

    // Query untuk rekap absensi dengan join ke tabel terkait
    let query = `
      SELECT 
        s.id as santri_id,
        s.nis,
        s.nama as nama_santri,
        k.nomor_kamar,
        k.nama_asrama,
        ja.nama as jenis_absensi,
        la.tanggal,
        la.status,
        la.catatan
      FROM log_absensi la
      JOIN santri s ON la.santri_id = s.id
      JOIN jenis_absensi ja ON la.jenis_absensi_id = ja.id
      LEFT JOIN kamar k ON s.kamar_id = k.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filter berdasarkan bulan (format: YYYY-MM)
    if (bulan) {
      query += ` AND TO_CHAR(la.tanggal, 'YYYY-MM') = $${paramIndex}`;
      params.push(bulan);
      paramIndex++;
    }

    // Filter berdasarkan jenis absensi
    if (jenis) {
      query += ` AND la.jenis_absensi_id = $${paramIndex}`;
      params.push(jenis);
      paramIndex++;
    }

    // Filter berdasarkan kamar
    if (kamar_id) {
      query += ` AND s.kamar_id = $${paramIndex}`;
      params.push(kamar_id);
      paramIndex++;
    }

    // Urutkan berdasarkan tanggal, asrama, kamar, nama
    query += ' ORDER BY la.tanggal DESC, k.nama_asrama, k.nomor_kamar, s.nama';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error mengambil rekap absensi:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil rekap absensi'
    });
  }
};

/**
 * Handler untuk mengambil statistik absensi (untuk dashboard)
 * Menampilkan ringkasan absensi hari ini dan bulan ini
 * 
 * @route GET /api/absensi/statistik
 * @returns {Object} Response dengan data statistik
 */
const getStatistikAbsensi = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Statistik absensi hari ini
    const hariIni = await pool.query(`
      SELECT 
        ja.nama as jenis_absensi,
        la.status,
        COUNT(*) as jumlah
      FROM log_absensi la
      JOIN jenis_absensi ja ON la.jenis_absensi_id = ja.id
      WHERE la.tanggal = $1
      GROUP BY ja.nama, la.status
      ORDER BY ja.nama, la.status
    `, [today]);

    // Total santri aktif
    const totalSantri = await pool.query(
      "SELECT COUNT(*) as total FROM santri WHERE status = 'aktif'"
    );

    // Total kamar
    const totalKamar = await pool.query(
      'SELECT COUNT(*) as total FROM kamar'
    );

    res.json({
      success: true,
      data: {
        hari_ini: hariIni.rows,
        total_santri: parseInt(totalSantri.rows[0].total),
        total_kamar: parseInt(totalKamar.rows[0].total),
        tanggal: today
      }
    });

  } catch (error) {
    console.error('Error mengambil statistik:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik absensi'
    });
  }
};

/**
 * Handler untuk mengambil absensi berdasarkan kamar dan tanggal
 * Digunakan saat pengurus akan melakukan absen di kamar tertentu
 * 
 * @route GET /api/absensi/kamar/:kamar_id
 * @param {string} req.params.kamar_id - ID kamar
 * @param {string} req.query.jenis_absensi_id - ID jenis absensi
 * @param {string} req.query.tanggal - Tanggal absensi (default: hari ini)
 * @returns {Object} Response dengan daftar santri dan status absensi terakhir
 */
const getAbsensiByKamar = async (req, res) => {
  try {
    const { kamar_id } = req.params;
    const { jenis_absensi_id, tanggal } = req.query;
    const tanggalAbsen = tanggal || new Date().toISOString().split('T')[0];

    // Ambil semua santri di kamar ini dengan status absensi terakhir
    const result = await pool.query(`
      SELECT 
        s.id as santri_id,
        s.nis,
        s.nama,
        s.status as status_santri,
        COALESCE(la.status, '-') as status_absen,
        COALESCE(la.catatan, '') as catatan
      FROM santri s
      LEFT JOIN log_absensi la ON s.id = la.santri_id 
        AND la.jenis_absensi_id = $2
        AND la.tanggal = $3
      WHERE s.kamar_id = $1
      ORDER BY s.nama
    `, [kamar_id, jenis_absensi_id, tanggalAbsen]);

    // Ambil info kamar
    const kamarInfo = await pool.query(
      'SELECT * FROM kamar WHERE id = $1',
      [kamar_id]
    );

    res.json({
      success: true,
      data: {
        kamar: kamarInfo.rows[0] || {},
        tanggal: tanggalAbsen,
        santri: result.rows
      }
    });

  } catch (error) {
    console.error('Error mengambil absensi kamar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data absensi kamar'
    });
  }
};

// Export semua handler
module.exports = {
  getJenisAbsensi,
  submitAbsensi,
  getRekapAbsensi,
  getStatistikAbsensi,
  getAbsensiByKamar
};
