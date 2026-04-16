// ============================================
// DATABASE SEED - DATA AWAL APLIKASI
// ============================================
// File ini mengisi database dengan data awal untuk testing
// Jalankan dengan: node database/seed.js
// PENTING: Jalankan migrate.js terlebih dahulu!

const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const seedData = async () => {
  const client = await pool.connect();

  try {
    console.log('🌱 Memulai seeding database...');

    await client.query('BEGIN');

    // ============================================
    // 1. DATA USER AWAL
    // Buat user admin default dan beberapa pengurus
    // ============================================
    console.log('  📝 Membuat data user...');

    // Hash password untuk keamanan
    const adminPassword = await bcrypt.hash('admin123', 10);
    const pengurusPassword = await bcrypt.hash('pengurus123', 10);

    // Insert user admin
    await client.query(`
      INSERT INTO users (nama, username, password_hash, role) 
      VALUES 
        ('Administrator', 'admin', $1, 'admin'),
        ('Ustadz Ahmad', 'ahmad', $2, 'pengurus'),
        ('Ustadzah Fatimah', 'fatimah', $2, 'pengurus')
      ON CONFLICT (username) DO NOTHING
    `, [adminPassword, pengurusPassword]);

    // ============================================
    // 2. DATA JENIS ABSENSI
    // 5 jenis absensi sesuai requirement
    // ============================================
    console.log('  📝 Membuat jenis absensi...');

    await client.query(`
      INSERT INTO jenis_absensi (id, nama, deskripsi) 
      VALUES 
        (1, 'Absen Malam', 'Pengecekan kehadiran santri di kamar pada malam hari'),
        (2, 'Absen Berjamaah', 'Absensi kehadiran sholat berjamaah (Subuh, Dzuhur, Ashar, Maghrib, Isya)'),
        (3, 'Absen Sakit Pagi', 'Pencatatan santri yang sakit saat pengecekan pagi hari'),
        (4, 'Absen Pengajian', 'Absensi kehadiran saat pengajian/kajian kitab'),
        (5, 'Rekap Asrama', 'Rekapitulasi semua absensi per asrama/kamar')
      ON CONFLICT (id) DO NOTHING
    `);

    // ============================================
    // 3. DATA KAMAR
    // Beberapa contoh kamar di berbagai asrama
    // ============================================
    console.log('  📝 Membuat data kamar...');

    await client.query(`
      INSERT INTO kamar (nomor_kamar, nama_asrama, kapasitas) 
      VALUES 
        ('A1', 'Asrama Putra Al-Fatih', 10),
        ('A2', 'Asrama Putra Al-Fatih', 10),
        ('A3', 'Asrama Putra Al-Fatih', 10),
        ('B1', 'Asrama Putra Al-Barqy', 8),
        ('B2', 'Asrama Putra Al-Barqy', 8),
        ('C1', 'Asrama Putri Aisyah', 10),
        ('C2', 'Asrama Putri Aisyah', 10),
        ('D1', 'Asrama Putri Khadijah', 8),
        ('D2', 'Asrama Putri Khadijah', 8)
      ON CONFLICT DO NOTHING
    `);

    // ============================================
    // 4. DATA SANTRI
    // Contoh data santri untuk testing
    // ============================================
    console.log('  📝 Membuat data santri...');

    // Dapatkan ID kamar yang sudah dibuat
    const kamarResult = await client.query('SELECT id, nomor_kamar FROM kamar');
    const kamarMap = {};
    kamarResult.rows.forEach(k => {
      kamarMap[k.nomor_kamar] = k.id;
    });

    // Insert data santri contoh
    await client.query(`
      INSERT INTO santri (nis, nama, kamar_id, status) 
      VALUES 
        ('2024001', 'Muhammad Rizki', ${kamarMap['A1']}, 'aktif'),
        ('2024002', 'Ahmad Fauzi', ${kamarMap['A1']}, 'aktif'),
        ('2024003', 'Abdullah Hakim', ${kamarMap['A1']}, 'aktif'),
        ('2024004', 'Farhan Akbar', ${kamarMap['A2']}, 'aktif'),
        ('2024005', 'Yusuf Ramadhan', ${kamarMap['A2']}, 'aktif'),
        ('2024006', 'Fathimah Zahra', ${kamarMap['C1']}, 'aktif'),
        ('2024007', 'Khadijah Nur', ${kamarMap['C1']}, 'aktif'),
        ('2024008', 'Aisyah Humaira', ${kamarMap['C1']}, 'aktif'),
        ('2024009', 'Zainab Maulida', ${kamarMap['C2']}, 'aktif'),
        ('2024010', 'Maryam Safitri', ${kamarMap['C2']}, 'aktif')
      ON CONFLICT (nis) DO NOTHING
    `);

    // ============================================
    // 5. DATA ABSENSI CONTOH
    // Beberapa data absensi untuk testing rekap
    // ============================================
    console.log('  📝 Membuat data absensi contoh...');

    // Dapatkan ID santri dan user pengurus
    const santriResult = await client.query('SELECT id FROM santri LIMIT 10');
    const userResult = await client.query("SELECT id FROM users WHERE role = 'pengurus' LIMIT 1");
    const pengurusId = userResult.rows[0]?.id;

    if (pengurusId && santriResult.rows.length > 0) {
      // Insert beberapa data absensi contoh untuk hari ini dan kemarin
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      for (const santri of santriResult.rows) {
        // Absen Malam - kemarin
        await client.query(`
          INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, pengurus_id)
          VALUES ($1, 1, $2, 'HADIR', $3)
          ON CONFLICT DO NOTHING
        `, [santri.id, yesterday, pengurusId]);

        // Absen Berjamaah - hari ini
        const statusBerjamaah = Math.random() > 0.2 ? 'HADIR' : (Math.random() > 0.5 ? 'SAKIT' : 'ALFA');
        await client.query(`
          INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, pengurus_id)
          VALUES ($1, 2, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [santri.id, today, statusBerjamaah, pengurusId]);
      }
    }

    await client.query('COMMIT');
    console.log('');
    console.log('🎉 Seeding database berhasil!');
    console.log('');
    console.log('📋 INFORMASI LOGIN DEFAULT:');
    console.log('   Admin:    username=admin,  password=admin123');
    console.log('   Pengurus: username=ahmad,  password=pengurus123');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saat seeding:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Jalankan seed
seedData();
