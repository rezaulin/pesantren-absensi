-- ============================================
-- SEED DATA - SISTEM ABSENSI PESANTREN
-- ============================================
-- File ini berisi data awal untuk mengisi database
-- Gunakan untuk testing dan demonstrasi aplikasi
-- Cara menjalankan: psql -U postgres -d pesantren_absensi -f seed.sql
-- PENTING: Jalankan schema.sql terlebih dahulu!

-- Catatan: Password sudah di-hash menggunakan bcrypt
-- admin123 -> $2a$10$hash... (untuk admin)
-- pengurus123 -> $2a$10$hash... (untuk pengurus)

-- ============================================
-- 1. DATA USER (2 admin + pengurus)
-- ============================================
-- Password default:
-- admin: admin123
-- ahmad: pengurus123
-- fatimah: pengurus123
INSERT INTO users (nama, username, password_hash, role) VALUES
('Administrator', 'admin', '$2a$10$rDkFObW5rBYGXF3n/PfOPOqVfJk1Mn5nYH5MNq5X9Sd1z3nOq5X9S', 'admin'),
('Ustadz Ahmad', 'ahmad', '$2a$10$rDkFObW5rBYGXF3n/PfOPOqVfJk1Mn5nYH5MNq5X9Sd1z3nOq5X9S', 'pengurus'),
('Ustadzah Fatimah', 'fatimah', '$2a$10$rDkFObW5rBYGXF3n/PfOPOqVfJk1Mn5nYH5MNq5X9Sd1z3nOq5X9S', 'pengurus')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 2. DATA JENIS ABSENSI (5 jenis)
-- ============================================
INSERT INTO jenis_absensi (id, nama, deskripsi) VALUES
(1, 'Absen Malam', 'Pengecekan kehadiran santri di kamar pada malam hari sebelum tidur'),
(2, 'Absen Berjamaah', 'Absensi kehadiran sholat berjamaah (Subuh, Dzuhur, Ashar, Maghrib, Isya)'),
(3, 'Absen Sakit Pagi', 'Pencatatan santri yang sakit saat pengecekan pagi hari'),
(4, 'Absen Pengajian', 'Absensi kehadiran saat pengajian/kajian kitab rutin'),
(5, 'Rekap Asrama', 'Rekapitulasi semua absensi per asrama/kamar')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. DATA KAMAR (5 kamar di 2 asrama)
-- ============================================
INSERT INTO kamar (nomor_kamar, nama_asrama, kapasitas) VALUES
('A1', 'Asrama Putra Al-Fatih', 10),
('A2', 'Asrama Putra Al-Fatih', 10),
('A3', 'Asrama Putra Al-Fatih', 10),
('B1', 'Asrama Putri Aisyah', 10),
('B2', 'Asrama Putri Aisyah', 10)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. DATA SANTRI (20 santri)
-- 4 santri per kamar, tersebar di 5 kamar
-- ============================================
-- Kamar A1 (Putra)
INSERT INTO santri (nis, nama, kamar_id, status) VALUES
('2024001', 'Muhammad Rizki', (SELECT id FROM kamar WHERE nomor_kamar = 'A1'), 'aktif'),
('2024002', 'Ahmad Fauzi', (SELECT id FROM kamar WHERE nomor_kamar = 'A1'), 'aktif'),
('2024003', 'Abdullah Hakim', (SELECT id FROM kamar WHERE nomor_kamar = 'A1'), 'aktif'),
('2024004', 'Farhan Akbar', (SELECT id FROM kamar WHERE nomor_kamar = 'A1'), 'aktif')
ON CONFLICT (nis) DO NOTHING;

-- Kamar A2 (Putra)
INSERT INTO santri (nis, nama, kamar_id, status) VALUES
('2024005', 'Yusuf Ramadhan', (SELECT id FROM kamar WHERE nomor_kamar = 'A2'), 'aktif'),
('2024006', 'Omar Syahid', (SELECT id FROM kamar WHERE nomor_kamar = 'A2'), 'aktif'),
('2024007', 'Hasan Basri', (SELECT id FROM kamar WHERE nomor_kamar = 'A2'), 'aktif'),
('2024008', 'Ali Imran', (SELECT id FROM kamar WHERE nomor_kamar = 'A2'), 'aktif')
ON CONFLICT (nis) DO NOTHING;

-- Kamar A3 (Putra)
INSERT INTO santri (nis, nama, kamar_id, status) VALUES
('2024009', 'Ibrahim Nur', (SELECT id FROM kamar WHERE nomor_kamar = 'A3'), 'aktif'),
('2024010', 'Musa Khalid', (SELECT id FROM kamar WHERE nomor_kamar = 'A3'), 'aktif'),
('2024011', 'Daud Hakim', (SELECT id FROM kamar WHERE nomor_kamar = 'A3'), 'aktif'),
('2024012', 'Sulaiman Raja', (SELECT id FROM kamar WHERE nomor_kamar = 'A3'), 'aktif')
ON CONFLICT (nis) DO NOTHING;

-- Kamar B1 (Putri)
INSERT INTO santri (nis, nama, kamar_id, status) VALUES
('2024013', 'Fathimah Zahra', (SELECT id FROM kamar WHERE nomor_kamar = 'B1'), 'aktif'),
('2024014', 'Khadijah Nur', (SELECT id FROM kamar WHERE nomor_kamar = 'B1'), 'aktif'),
('2024015', 'Aisyah Humaira', (SELECT id FROM kamar WHERE nomor_kamar = 'B1'), 'aktif'),
('2024016', 'Zainab Maulida', (SELECT id FROM kamar WHERE nomor_kamar = 'B1'), 'aktif')
ON CONFLICT (nis) DO NOTHING;

-- Kamar B2 (Putri)
INSERT INTO santri (nis, nama, kamar_id, status) VALUES
('2024017', 'Maryam Safitri', (SELECT id FROM kamar WHERE nomor_kamar = 'B2'), 'aktif'),
('2024018', 'Hafsah Wati', (SELECT id FROM kamar WHERE nomor_kamar = 'B2'), 'aktif'),
('2024019', 'Rukanah Putri', (SELECT id FROM kamar WHERE nomor_kamar = 'B2'), 'aktif'),
('2024020', 'Ummu Kalsum', (SELECT id FROM kamar WHERE nomor_kamar = 'B2'), 'aktif')
ON CONFLICT (nis) DO NOTHING;

-- ============================================
-- 5. DATA LOG ABSENSI CONTOH
-- Beberapa data absensi untuk testing fitur rekap
-- ============================================

-- Absen Malam untuk semua santri (kemarin)
INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, pengurus_id)
SELECT 
    s.id,
    1,  -- Absen Malam
    CURRENT_DATE - INTERVAL '1 day',
    'HADIR',
    (SELECT id FROM users WHERE username = 'ahmad')
FROM santri s
WHERE s.status = 'aktif'
ON CONFLICT DO NOTHING;

-- Absen Berjamaah untuk semua santri (hari ini) dengan variasi status
INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, pengurus_id)
SELECT 
    s.id,
    2,  -- Absen Berjamaah
    CURRENT_DATE,
    CASE 
        WHEN s.id % 10 = 0 THEN 'SAKIT'   -- 10% sakit
        WHEN s.id % 15 = 0 THEN 'IZIN'     -- ~7% izin
        WHEN s.id % 20 = 0 THEN 'ALFA'     -- 5% alfa
        ELSE 'HADIR'                        -- sisanya hadir
    END,
    (SELECT id FROM users WHERE username = 'ahmad')
FROM santri s
WHERE s.status = 'aktif'
ON CONFLICT DO NOTHING;

-- Absen Pengajian untuk beberapa santri (kemarin)
INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, pengurus_id, catatan)
SELECT 
    s.id,
    4,  -- Absen Pengajian
    CURRENT_DATE - INTERVAL '1 day',
    CASE 
        WHEN s.id % 5 = 0 THEN 'IZIN'
        ELSE 'HADIR'
    END,
    (SELECT id FROM users WHERE username = 'fatimah'),
    CASE WHEN s.id % 5 = 0 THEN 'Izin keluarga' ELSE NULL END
FROM santri s
WHERE s.status = 'aktif' AND s.kamar_id IN (SELECT id FROM kamar WHERE nama_asrama LIKE '%Putri%')
ON CONFLICT DO NOTHING;

-- Absen Sakit Pagi untuk 2 santri (hari ini)
INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, pengurus_id, catatan) VALUES
((SELECT id FROM santri WHERE nis = '2024003'), 3, CURRENT_DATE, 'SAKIT', 
 (SELECT id FROM users WHERE username = 'ahmad'), 'Demam dan flu'),
((SELECT id FROM santri WHERE nis = '2024015'), 3, CURRENT_DATE, 'SAKIT', 
 (SELECT id FROM users WHERE username = 'fatimah'), 'Sakit kepala')
ON CONFLICT DO NOTHING;

-- Tambahkan data absensi 7 hari terakhir untuk testing rekap
INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, pengurus_id)
SELECT 
    s.id,
    1,  -- Absen Malam
    CURRENT_DATE - INTERVAL '2 days',
    CASE WHEN s.id % 8 = 0 THEN 'ALFA' ELSE 'HADIR' END,
    (SELECT id FROM users WHERE username = 'ahmad')
FROM santri s WHERE s.status = 'aktif'
ON CONFLICT DO NOTHING;

INSERT INTO log_absensi (santri_id, jenis_absensi_id, tanggal, status, pengurus_id)
SELECT 
    s.id,
    2,  -- Absen Berjamaah
    CURRENT_DATE - INTERVAL '2 days',
    CASE WHEN s.id % 12 = 0 THEN 'IZIN' ELSE 'HADIR' END,
    (SELECT id FROM users WHERE username = 'ahmad')
FROM santri s WHERE s.status = 'aktif'
ON CONFLICT DO NOTHING;

-- Selesai!
-- Jalankan: psql -U postgres -d pesantren_absensi -f seed.sql
-- Login dengan:
--   admin / admin123 (akses penuh)
--   ahmad / pengurus123 (akses pengurus)
--   fatimah / pengurus123 (akses pengurus)
