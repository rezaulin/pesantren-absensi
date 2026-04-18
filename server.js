const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pesantren-secret-key';
const DB_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer - memory storage, max 5MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── JSON Database ──────────────────────────────────────
function loadDB() {
  if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  return { users: [], kamar: [], santri: [], absensi: [], absen_malam: [], absen_sekolah: [], absensi_sesi: [], pengumuman: [], kegiatan: [] };
}
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

// Init default admin
let db = loadDB();
if (!db.users.find(u => u.username === 'admin')) {
  db.users.push({ id: 1, username: 'admin', password_hash: bcrypt.hashSync('admin123', 10), role: 'admin', nama: 'Administrator', created_at: new Date().toISOString() });
  saveDB(db);
  console.log('Default admin: admin / admin123');
}
// Init default kegiatan
if (!db.kegiatan) db.kegiatan = [];
if (db.kegiatan.length === 0) {
  db.kegiatan = [
    { id: 1, nama: 'Ngaji Pagi', created_at: new Date().toISOString() },
    { id: 2, nama: "Ngaji Qur'an Siang", created_at: new Date().toISOString() },
    { id: 3, nama: 'Bakat', created_at: new Date().toISOString() },
    { id: 4, nama: 'Madrasah Diniyyah', created_at: new Date().toISOString() },
    { id: 5, nama: 'Ngaji Malam', created_at: new Date().toISOString() },
  ];
}
// Ensure "Sekolah Formal" exists (auto-add if missing)
if (!db.kegiatan.find(k => k.nama.toLowerCase().includes('sekolah'))) {
  db.kegiatan.push({ id: nextId(db.kegiatan), nama: 'Sekolah Formal', created_at: new Date().toISOString() });
}
saveDB(db);

// ── Auth ───────────────────────────────────────────────
function authenticate(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token tidak ada' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Token tidak valid' }); }
}
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });
  next();
}

// ── Auth Routes ────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ message: 'Username/password salah' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, nama: user.nama }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, nama: user.nama } });
});
app.get('/api/me', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
  res.json({ id: user.id, username: user.username, role: user.role, nama: user.nama });
});

// ── Dashboard ──────────────────────────────────────────
app.get('/api/dashboard', authenticate, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  // Wali: dashboard khusus anak-anaknya
  if (req.user.role === 'wali') {
    const anakList = db.santri.filter(s => s.wali_user_id === req.user.id);
    const anakIds = anakList.map(s => s.id);
    const absensiToday = db.absensi.filter(a => anakIds.includes(a.santri_id) && a.tanggal === today);
    const hadir = absensiToday.filter(a => a.status === 'H').length;
    const izin = absensiToday.filter(a => a.status === 'I' || a.status === 'S').length;
    const alfa = absensiToday.filter(a => a.status === 'A').length;
    // Rekap per kegiatan untuk semua anak
    const allAbsensi = db.absensi.filter(a => anakIds.includes(a.santri_id));
    const rekapKegiatan = {};
    allAbsensi.forEach(a => {
      const kg = db.kegiatan.find(k => k.id === a.kegiatan_id);
      const nama = kg ? kg.nama : 'Lainnya';
      if (!rekapKegiatan[nama]) rekapKegiatan[nama] = { H: 0, I: 0, S: 0, A: 0 };
      rekapKegiatan[nama][a.status]++;
    });
    return res.json({
      role: 'wali',
      anak: anakList.map(s => {
        const k = db.kamar.find(x => x.id === s.kamar_id);
        const anakAbsensi = db.absensi.filter(a => a.santri_id === s.id);
        return {
          id: s.id, nama: s.nama, kamar_nama: k ? k.nama : '-',
          kelas_diniyyah: s.kelas_diniyyah, kelompok_ngaji: s.kelompok_ngaji,
          total_hadir: anakAbsensi.filter(a => a.status === 'H').length,
          total_izin: anakAbsensi.filter(a => a.status === 'I').length,
          total_sakit: anakAbsensi.filter(a => a.status === 'S').length,
          total_alfa: anakAbsensi.filter(a => a.status === 'A').length,
        };
      }),
      hadir_hari_ini: hadir, izin_sakit: izin, alfa,
      rekap_kegiatan: rekapKegiatan,
      pengumuman: db.pengumuman.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
    });
  }
  // Admin/ustadz: dashboard biasa
  const hadir = db.absensi.filter(a => a.tanggal === today && a.status === 'H').length;
  const izin = db.absensi.filter(a => a.tanggal === today && (a.status === 'I' || a.status === 'S')).length;
  const alfa = db.absensi.filter(a => a.tanggal === today && a.status === 'A').length;
  res.json({
    total_santri: db.santri.filter(s => s.status === 'aktif').length,
    total_kamar: db.kamar.length,
    hadir_hari_ini: hadir,
    izin_sakit: izin,
    alfa: alfa,
    pengumuman: db.pengumuman.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3)
  });
});

// ── Wali Endpoints ─────────────────────────────────────
app.get('/api/wali/anak', authenticate, (req, res) => {
  if (req.user.role !== 'wali') return res.status(403).json({ message: 'Hanya wali santri' });
  const anakList = db.santri.filter(s => s.wali_user_id === req.user.id);
  res.json(anakList.map(s => {
    const k = db.kamar.find(x => x.id === s.kamar_id);
    return { ...s, kamar_nama: k ? k.nama : '-' };
  }));
});
app.get('/api/wali/rekap', authenticate, (req, res) => {
  if (req.user.role !== 'wali') return res.status(403).json({ message: 'Hanya wali santri' });
  const anakIds = db.santri.filter(s => s.wali_user_id === req.user.id).map(s => s.id);
  let list = db.absensi.filter(a => anakIds.includes(a.santri_id));
  if (req.query.santri_id) list = list.filter(a => a.santri_id == req.query.santri_id);
  if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
  if (req.query.kegiatan_id) list = list.filter(a => a.kegiatan_id == req.query.kegiatan_id);
  res.json(list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    const kg = db.kegiatan.find(x => x.id === a.kegiatan_id);
    return { tanggal: a.tanggal, nama: s ? s.nama : '-', kamar_nama: k ? k.nama : '-', kegiatan_nama: kg ? kg.nama : '-', status: a.status, keterangan: a.keterangan };
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal)));
});

// ── Users ──────────────────────────────────────────────
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  res.json(db.users.map(u => ({ id: u.id, username: u.username, nama: u.nama, role: u.role, created_at: u.created_at })));
});
app.post('/api/users', authenticate, requireAdmin, (req, res) => {
  const { username, password, role, nama } = req.body;
  if (!username || !password || !nama) return res.status(400).json({ message: 'Semua field wajib' });
  if (db.users.find(u => u.username === username)) return res.status(400).json({ message: 'Username sudah ada' });
  const user = { id: nextId(db.users), username, password_hash: bcrypt.hashSync(password, 10), role: role || 'ustadz', nama, created_at: new Date().toISOString() };
  db.users.push(user); saveDB(db); res.json({ message: 'User ditambahkan', user: { id: user.id, username: user.username, nama: user.nama, role: user.role } });
});
app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
  const { username, password, role, nama } = req.body;
  if (username) user.username = username;
  if (nama) user.nama = nama;
  if (role) user.role = role;
  if (password) user.password_hash = bcrypt.hashSync(password, 10);
  saveDB(db); res.json({ message: 'User diupdate' });
});
app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  if (req.user.id == req.params.id) return res.status(400).json({ message: 'Tidak bisa hapus diri sendiri' });
  db.users = db.users.filter(u => u.id != req.params.id); saveDB(db);
  res.json({ message: 'User dihapus' });
});

// ── Kamar ──────────────────────────────────────────────
app.get('/api/kamar', authenticate, (req, res) => {
  res.json(db.kamar.map(k => ({
    ...k, jumlah_santri: db.santri.filter(s => s.kamar_id === k.id && s.status === 'aktif').length
  })));
});
app.post('/api/kamar', authenticate, requireAdmin, (req, res) => {
  const { nama, kapasitas, pengurus } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama wajib' });
  const k = { id: nextId(db.kamar), nama, kapasitas: kapasitas || 10, pengurus: pengurus || '' };
  db.kamar.push(k); saveDB(db); res.json(k);
});
app.put('/api/kamar/:id', authenticate, requireAdmin, (req, res) => {
  const k = db.kamar.find(x => x.id == req.params.id);
  if (!k) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  Object.assign(k, req.body); saveDB(db); res.json({ message: 'Kamar diupdate' });
});
app.delete('/api/kamar/:id', authenticate, requireAdmin, (req, res) => {
  db.kamar = db.kamar.filter(k => k.id != req.params.id); saveDB(db);
  res.json({ message: 'Kamar dihapus' });
});

// ── Santri ─────────────────────────────────────────────
app.get('/api/santri', authenticate, (req, res) => {
  let list = db.santri;
  if (req.query.kamar_id) list = list.filter(s => s.kamar_id == req.query.kamar_id);
  if (req.query.kelas_diniyyah) list = list.filter(s => s.kelas_diniyyah === req.query.kelas_diniyyah);
  if (req.query.kelompok_ngaji) list = list.filter(s => s.kelompok_ngaji === req.query.kelompok_ngaji);
  if (req.query.kelas_sekolah) list = list.filter(s => s.kelas_sekolah === req.query.kelas_sekolah);
  if (req.query.jenis_bakat) list = list.filter(s => s.jenis_bakat === req.query.jenis_bakat);
  if (req.query.kelompok_ngaji_malam) list = list.filter(s => s.kelompok_ngaji_malam === req.query.kelompok_ngaji_malam);
  res.json(list.map(s => {
    const k = db.kamar.find(x => x.id === s.kamar_id);
    return { ...s, kamar_nama: k ? k.nama : '-' };
  }));
});
app.post('/api/santri', authenticate, requireAdmin, (req, res) => {
  const { nama, kamar_id, status, kelas_diniyyah, kelompok_ngaji, jenis_bakat, kelas_sekolah, kelompok_ngaji_malam, wali_user_id, extra } = req.body;
  if (!nama || !kamar_id) return res.status(400).json({ message: 'Nama & kamar wajib' });
  const s = {
    id: nextId(db.santri), nama, kamar_id: parseInt(kamar_id), status: status || 'aktif',
    kelas_diniyyah: kelas_diniyyah || '', kelompok_ngaji: kelompok_ngaji || '',
    jenis_bakat: jenis_bakat || '', kelas_sekolah: kelas_sekolah || '',
    kelompok_ngaji_malam: kelompok_ngaji_malam || '',
    extra: extra || {},
    wali_user_id: wali_user_id ? parseInt(wali_user_id) : null,
    extra: req.body.extra || {},
    created_at: new Date().toISOString()
  };
  db.santri.push(s); saveDB(db); res.json(s);
});
app.put('/api/santri/:id', authenticate, requireAdmin, (req, res) => {
  const s = db.santri.find(x => x.id == req.params.id);
  if (!s) return res.status(404).json({ message: 'Santri tidak ditemukan' });
  const fields = ['nama', 'status', 'kelas_diniyyah', 'kelompok_ngaji', 'jenis_bakat', 'kelas_sekolah', 'kelompok_ngaji_malam'];
  fields.forEach(f => { if (req.body[f] !== undefined) s[f] = req.body[f]; });
  if (req.body.kamar_id) s.kamar_id = parseInt(req.body.kamar_id);
  if (req.body.wali_user_id !== undefined) s.wali_user_id = req.body.wali_user_id ? parseInt(req.body.wali_user_id) : null;
  if (req.body.extra !== undefined) s.extra = req.body.extra;
  saveDB(db); res.json({ message: 'Santri diupdate' });
});
app.delete('/api/santri/:id', authenticate, requireAdmin, (req, res) => {
  db.santri = db.santri.filter(s => s.id != req.params.id); saveDB(db);
  res.json({ message: 'Santri dihapus' });
});

// ── Kegiatan ───────────────────────────────────────────
app.get('/api/kegiatan', authenticate, (req, res) => {
  res.json(db.kegiatan);
});
app.post('/api/kegiatan', authenticate, requireAdmin, (req, res) => {
  const { nama } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama kegiatan wajib' });
  const k = { id: nextId(db.kegiatan), nama, created_at: new Date().toISOString() };
  db.kegiatan.push(k); saveDB(db); res.json(k);
});
app.put('/api/kegiatan/:id', authenticate, requireAdmin, (req, res) => {
  const k = db.kegiatan.find(x => x.id == req.params.id);
  if (!k) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
  if (req.body.nama) k.nama = req.body.nama;
  saveDB(db); res.json({ message: 'Kegiatan diupdate' });
});
app.delete('/api/kegiatan/:id', authenticate, requireAdmin, (req, res) => {
  db.kegiatan = db.kegiatan.filter(k => k.id != req.params.id); saveDB(db);
  res.json({ message: 'Kegiatan dihapus' });
});

// ── Absensi ────────────────────────────────────────────
app.get('/api/absensi', authenticate, (req, res) => {
  let list = db.absensi;
  if (req.query.tanggal) list = list.filter(a => a.tanggal === req.query.tanggal);
  if (req.query.kegiatan_id) list = list.filter(a => a.kegiatan_id == req.query.kegiatan_id);
  // Filter by santri attributes
  const santriFilters = ['kamar_id', 'kelas_diniyyah', 'kelompok_ngaji', 'kelompok_ngaji_malam', 'jenis_bakat', 'kelas_sekolah'];
  santriFilters.forEach(f => {
    if (req.query[f]) {
      const santriIds = db.santri.filter(s => String(s[f]) === String(req.query[f])).map(s => s.id);
      list = list.filter(a => santriIds.includes(a.santri_id));
    }
  });
  // Filter by extra field
  if (req.query.extra_key && req.query.extra_val) {
    const santriIds = db.santri.filter(s => s.extra && s.extra[req.query.extra_key] === req.query.extra_val).map(s => s.id);
    list = list.filter(a => santriIds.includes(a.santri_id));
  }
  res.json(list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    const kg = db.kegiatan.find(x => x.id === a.kegiatan_id);
    const u = db.users.find(x => x.id === a.recorded_by);
    return { ...a, santri_nama: s ? s.nama : '-', kamar_nama: k ? k.nama : '-', kegiatan_nama: kg ? kg.nama : '-', recorded_by_nama: u ? u.nama : '-' };
  }));
});
app.post('/api/absensi/bulk', authenticate, (req, res) => {
  if (req.user.role === 'wali') return res.status(403).json({ message: 'Wali tidak bisa mengubah absensi' });
  const { tanggal, kegiatan_id, items } = req.body;
  if (!tanggal || !kegiatan_id || !items) return res.status(400).json({ message: 'Data tidak lengkap (tanggal, kegiatan_id, items wajib)' });
  // ── Sesi: replace jika sudah ada (transparan) ──
  if (!db.absensi_sesi) db.absensi_sesi = [];
  const oldSesi = db.absensi_sesi.find(s => s.ustadz_username === req.user.username && s.kegiatan_id == kegiatan_id && s.tanggal === tanggal);
  if (oldSesi) {
    // Hapus absensi lama milik ustadz ini untuk kegiatan+tanggal ini
    db.absensi = db.absensi.filter(a => !(a.kegiatan_id == kegiatan_id && a.tanggal === tanggal && a.recorded_by === req.user.id));
    // Update timestamp sesi
    oldSesi.created_at = new Date().toISOString();
  } else {
    // Buat sesi baru
    db.absensi_sesi.push({ id: nextId(db.absensi_sesi), ustadz_username: req.user.username, kegiatan_id: parseInt(kegiatan_id), tanggal, created_at: new Date().toISOString() });
  }
  // Insert absensi baru (fresh, bukan upsert)
  items.forEach(item => {
    db.absensi.push({ id: nextId(db.absensi), santri_id: item.santri_id, kegiatan_id: parseInt(kegiatan_id), tanggal, status: item.status, keterangan: item.keterangan || '', recorded_by: req.user.id, created_at: new Date().toISOString() });
  });
  saveDB(db); res.json({ message: 'Absensi tersimpan' });
});

// ── Absen Malam (Tabel Terpisah) ───────────────────────
app.get('/api/absen-malam', authenticate, (req, res) => {
  let list = db.absen_malam || [];
  if (req.query.tanggal) list = list.filter(a => a.tanggal === req.query.tanggal);
  if (req.query.kamar_id) {
    const santriIds = db.santri.filter(s => s.kamar_id == req.query.kamar_id).map(s => s.id);
    list = list.filter(a => santriIds.includes(a.santri_id));
  }
  res.json(list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    return { ...a, nama: s ? s.nama : '-', kamar_nama: k ? k.nama : '-' };
  }));
});

app.post('/api/absen-malam/bulk', authenticate, (req, res) => {
  if (req.user.role === 'wali') return res.status(403).json({ message: 'Wali tidak bisa mengubah absensi' });
  if (!db.absen_malam) db.absen_malam = [];
  if (!db.absensi_sesi) db.absensi_sesi = [];
  const { tanggal, items } = req.body;
  if (!tanggal || !items) return res.status(400).json({ message: 'Data tidak lengkap (tanggal, items wajib)' });
  // ── Sesi: replace jika sudah ada ──
  const sesiKey = { ustadz_username: req.user.username, kegiatan_id: 0, kegiatan_nama: 'Absen Malam' };
  const oldSesiMalam = db.absensi_sesi.find(s => s.ustadz_username === req.user.username && s.kegiatan_nama === 'Absen Malam' && s.tanggal === tanggal);
  if (oldSesiMalam) {
    db.absen_malam = db.absen_malam.filter(a => !(a.tanggal === tanggal && a.recorded_by === req.user.id));
    oldSesiMalam.created_at = new Date().toISOString();
  } else {
    db.absensi_sesi.push({ id: nextId(db.absensi_sesi), ustadz_username: req.user.username, kegiatan_id: 0, kegiatan_nama: 'Absen Malam', tanggal, created_at: new Date().toISOString() });
  }
  // Insert fresh
  items.forEach(item => {
    db.absen_malam.push({ id: nextId(db.absen_malam), santri_id: item.santri_id, tanggal, status: item.status, keterangan: item.keterangan || '', recorded_by: req.user.id, created_at: new Date().toISOString() });
  });
  saveDB(db); res.json({ message: 'Absen malam tersimpan' });
});

// ── Absen Sekolah (Tabel Terpisah) ─────────────────────
app.get('/api/absen-sekolah', authenticate, (req, res) => {
  let list = db.absen_sekolah || [];
  if (req.query.tanggal) list = list.filter(a => a.tanggal === req.query.tanggal);
  if (req.query.kelas_sekolah) {
    const santriIds = db.santri.filter(s => s.kelas_sekolah === req.query.kelas_sekolah).map(s => s.id);
    list = list.filter(a => santriIds.includes(a.santri_id));
  }
  res.json(list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    return { ...a, nama: s ? s.nama : '-', kelas_sekolah: s ? s.kelas_sekolah || '-' : '-', kamar_nama: k ? k.nama : '-' };
  }));
});

app.post('/api/absen-sekolah/bulk', authenticate, (req, res) => {
  if (req.user.role === 'wali') return res.status(403).json({ message: 'Wali tidak bisa mengubah absensi' });
  if (!db.absen_sekolah) db.absen_sekolah = [];
  if (!db.absensi_sesi) db.absensi_sesi = [];
  const { tanggal, items } = req.body;
  if (!tanggal || !items) return res.status(400).json({ message: 'Data tidak lengkap (tanggal, items wajib)' });
  // ── Sesi: replace jika sudah ada ──
  const oldSesiSekolah = db.absensi_sesi.find(s => s.ustadz_username === req.user.username && s.kegiatan_nama === 'Sekolah Formal' && s.tanggal === tanggal);
  if (oldSesiSekolah) {
    db.absen_sekolah = db.absen_sekolah.filter(a => !(a.tanggal === tanggal && a.recorded_by === req.user.id));
    oldSesiSekolah.created_at = new Date().toISOString();
  } else {
    db.absensi_sesi.push({ id: nextId(db.absensi_sesi), ustadz_username: req.user.username, kegiatan_id: 0, kegiatan_nama: 'Sekolah Formal', tanggal, created_at: new Date().toISOString() });
  }
  // Insert fresh
  items.forEach(item => {
    db.absen_sekolah.push({ id: nextId(db.absen_sekolah), santri_id: item.santri_id, tanggal, status: item.status, keterangan: item.keterangan || '', recorded_by: req.user.id, created_at: new Date().toISOString() });
  });
  saveDB(db); res.json({ message: 'Absen sekolah tersimpan' });
});

// ── Rekap ──────────────────────────────────────────────
app.get('/api/rekap', authenticate, (req, res) => {
  // Rekap Absen Malam - tabel terpisah
  if (req.query.tipe === 'absen_malam') {
    let list = db.absen_malam || [];
    if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
    if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
    const santriFilters = ['kamar_id', 'kelompok_ngaji_malam'];
    santriFilters.forEach(f => {
      if (req.query[f]) {
        const santriIds = db.santri.filter(s => String(s[f]) === String(req.query[f])).map(s => s.id);
        list = list.filter(a => santriIds.includes(a.santri_id));
      }
    });
    return res.json(list.map(a => {
      const s = db.santri.find(x => x.id === a.santri_id);
      const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
      return { tanggal: a.tanggal, nama: s ? s.nama : '-', kamar_nama: k ? k.nama : '-', kegiatan_nama: 'Absen Malam', status: a.status, keterangan: a.keterangan };
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal)));
  }
  // Rekap Absen Sekolah - tabel terpisah
  if (req.query.tipe === 'absen_sekolah') {
    let list = db.absen_sekolah || [];
    if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
    if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
    if (req.query.kelas_sekolah) {
      const santriIds = db.santri.filter(s => s.kelas_sekolah === req.query.kelas_sekolah).map(s => s.id);
      list = list.filter(a => santriIds.includes(a.santri_id));
    }
    return res.json(list.map(a => {
      const s = db.santri.find(x => x.id === a.santri_id);
      const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
      return { tanggal: a.tanggal, nama: s ? s.nama : '-', kamar_nama: k ? k.nama : '-', kegiatan_nama: 'Sekolah Formal', status: a.status, keterangan: a.keterangan };
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal)));
  }
  // Rekap Absensi biasa
  let list = db.absensi;
  if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
  if (req.query.kegiatan_id) list = list.filter(a => a.kegiatan_id == req.query.kegiatan_id);
  // Filter by santri attributes
  const santriFilters = ['kamar_id', 'kelas_diniyyah', 'kelompok_ngaji', 'kelompok_ngaji_malam', 'jenis_bakat', 'kelas_sekolah'];
  santriFilters.forEach(f => {
    if (req.query[f]) {
      const santriIds = db.santri.filter(s => String(s[f]) === String(req.query[f])).map(s => s.id);
      list = list.filter(a => santriIds.includes(a.santri_id));
    }
  });
  // Filter by extra field
  if (req.query.extra_key && req.query.extra_val) {
    const santriIds = db.santri.filter(s => s.extra && s.extra[req.query.extra_key] === req.query.extra_val).map(s => s.id);
    list = list.filter(a => santriIds.includes(a.santri_id));
  }
  res.json(list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    const kg = db.kegiatan.find(x => x.id === a.kegiatan_id);
    return { tanggal: a.tanggal, nama: s ? s.nama : '-', kamar_nama: k ? k.nama : '-', kegiatan_nama: kg ? kg.nama : '-', status: a.status, keterangan: a.keterangan };
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal)));
});

// ── Pengumuman ─────────────────────────────────────────
app.get('/api/pengumuman', authenticate, (req, res) => {
  res.json(db.pengumuman.map(p => {
    const u = db.users.find(x => x.id === p.created_by);
    return { ...p, created_by_nama: u ? u.nama : 'Admin' };
  }).sort((a, b) => b.created_at.localeCompare(a.created_at)));
});
app.post('/api/pengumuman', authenticate, requireAdmin, (req, res) => {
  const { judul, isi } = req.body;
  if (!judul || !isi) return res.status(400).json({ message: 'Judul & isi wajib' });
  const p = { id: nextId(db.pengumuman), judul, isi, created_by: req.user.id, created_at: new Date().toISOString() };
  db.pengumuman.push(p); saveDB(db); res.json(p);
});
app.delete('/api/pengumuman/:id', authenticate, requireAdmin, (req, res) => {
  db.pengumuman = db.pengumuman.filter(p => p.id != req.params.id); saveDB(db);
  res.json({ message: 'Pengumuman dihapus' });
});

// ── Pelanggaran ──────────────────────────────────────────
app.get('/api/pelanggaran', authenticate, (req, res) => {
  let list = db.pelanggaran || [];
  if (req.query.santri_id) list = list.filter(p => p.santri_id == req.query.santri_id);
  if (req.query.dari) list = list.filter(p => p.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(p => p.tanggal <= req.query.sampai);
  res.json(list.map(p => {
    const s = db.santri.find(x => x.id === p.santri_id);
    return { ...p, santri_nama: s ? s.nama : '-' };
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal)));
});
app.post('/api/pelanggaran', authenticate, requireAdmin, (req, res) => {
  const { santri_id, tanggal, jenis, keterangan, sanksi } = req.body;
  if (!santri_id || !tanggal || !jenis) return res.status(400).json({ message: 'Santri, tanggal & jenis wajib' });
  if (!db.pelanggaran) db.pelanggaran = [];
  const p = { id: nextId(db.pelanggaran), santri_id: parseInt(santri_id), tanggal, jenis, keterangan: keterangan || '', sanksi: sanksi || '', created_at: new Date().toISOString() };
  db.pelanggaran.push(p); saveDB(db); res.json(p);
});
app.put('/api/pelanggaran/:id', authenticate, requireAdmin, (req, res) => {
  if (!db.pelanggaran) return res.status(404).json({ message: 'Tidak ditemukan' });
  const p = db.pelanggaran.find(x => x.id == req.params.id);
  if (!p) return res.status(404).json({ message: 'Tidak ditemukan' });
  ['tanggal', 'jenis', 'keterangan', 'sanksi'].forEach(f => { if (req.body[f] !== undefined) p[f] = req.body[f]; });
  if (req.body.santri_id) p.santri_id = parseInt(req.body.santri_id);
  saveDB(db); res.json({ message: 'Pelanggaran diupdate' });
});
app.delete('/api/pelanggaran/:id', authenticate, requireAdmin, (req, res) => {
  if (!db.pelanggaran) return res.status(404).json({ message: 'Tidak ditemukan' });
  db.pelanggaran = db.pelanggaran.filter(p => p.id != req.params.id); saveDB(db);
  res.json({ message: 'Pelanggaran dihapus' });
});

// ── Catatan Guru ────────────────────────────────────────
app.get('/api/catatan', authenticate, (req, res) => {
  let list = db.catatan_guru || [];
  // Wali: only see notes for their children
  if (req.user.role === 'wali') {
    const anakIds = db.santri.filter(s => s.wali_user_id === req.user.id).map(s => s.id);
    list = list.filter(c => anakIds.includes(c.santri_id));
  }
  if (req.query.santri_id) list = list.filter(c => c.santri_id == req.query.santri_id);
  if (req.query.kategori) list = list.filter(c => c.kategori === req.query.kategori);
  if (req.query.dari) list = list.filter(c => c.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(c => c.tanggal <= req.query.sampai);
  res.json(list.map(c => {
    const s = db.santri.find(x => x.id === c.santri_id);
    const u = db.users.find(x => x.id === c.created_by);
    return { ...c, santri_nama: s ? s.nama : '-', guru_nama: u ? u.nama : '-' };
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal)));
});
app.post('/api/catatan', authenticate, (req, res) => {
  if (req.user.role === 'wali') return res.status(403).json({ message: 'Wali tidak bisa membuat catatan' });
  const { santri_id, tanggal, judul, isi, kategori } = req.body;
  if (!santri_id || !tanggal || !isi) return res.status(400).json({ message: 'Santri, tanggal & isi wajib' });
  if (!db.catatan_guru) db.catatan_guru = [];
  const c = {
    id: nextId(db.catatan_guru), santri_id: parseInt(santri_id), tanggal,
    judul: judul || '', isi, kategori: kategori || 'lainnya',
    created_by: req.user.id, created_at: new Date().toISOString()
  };
  db.catatan_guru.push(c); saveDB(db); res.json(c);
});
app.put('/api/catatan/:id', authenticate, (req, res) => {
  if (req.user.role === 'wali') return res.status(403).json({ message: 'Wali tidak bisa mengubah catatan' });
  if (!db.catatan_guru) return res.status(404).json({ message: 'Tidak ditemukan' });
  const c = db.catatan_guru.find(x => x.id == req.params.id);
  if (!c) return res.status(404).json({ message: 'Tidak ditemukan' });
  ['santri_id', 'tanggal', 'judul', 'isi', 'kategori'].forEach(f => { if (req.body[f] !== undefined) c[f] = req.body[f]; });
  if (req.body.santri_id) c.santri_id = parseInt(req.body.santri_id);
  saveDB(db); res.json({ message: 'Catatan diupdate' });
});
app.delete('/api/catatan/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });
  if (!db.catatan_guru) return res.status(404).json({ message: 'Tidak ditemukan' });
  db.catatan_guru = db.catatan_guru.filter(c => c.id != req.params.id);
  saveDB(db); res.json({ message: 'Catatan dihapus' });
});

// ── Raport Santri ───────────────────────────────────────
app.get('/api/raport/:santri_id', authenticate, (req, res) => {
  const santri = db.santri.find(s => s.id == req.params.santri_id);
  if (!santri) return res.status(404).json({ message: 'Santri tidak ditemukan' });
  const kamar = db.kamar.find(k => k.id === santri.kamar_id);
  let absensiList = db.absensi.filter(a => a.santri_id === santri.id);
  if (req.query.dari) absensiList = absensiList.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) absensiList = absensiList.filter(a => a.tanggal <= req.query.sampai);
  let pelanggaranList = (db.pelanggaran || []).filter(p => p.santri_id === santri.id);
  if (req.query.dari) pelanggaranList = pelanggaranList.filter(p => p.tanggal >= req.query.dari);
  if (req.query.sampai) pelanggaranList = pelanggaranList.filter(p => p.tanggal <= req.query.sampai);
  let catatanList = (db.catatan_guru || []).filter(c => c.santri_id === santri.id);
  if (req.query.dari) catatanList = catatanList.filter(c => c.tanggal >= req.query.dari);
  if (req.query.sampai) catatanList = catatanList.filter(c => c.tanggal <= req.query.sampai);
  // Group absensi by kegiatan - show ALL kegiatan
  const rekap = {};
  // Initialize all kegiatan with 0
  db.kegiatan.forEach(k => {
    rekap[k.nama] = { H: 0, I: 0, S: 0, A: 0, detail: [] };
  });
  // Fill in actual data
  absensiList.forEach(a => {
    const kg = db.kegiatan.find(k => k.id === a.kegiatan_id);
    const nama = kg ? kg.nama : 'Lainnya';
    if (!rekap[nama]) rekap[nama] = { H: 0, I: 0, S: 0, A: 0, detail: [] };
    rekap[nama][a.status] = (rekap[nama][a.status] || 0) + 1;
    rekap[nama].detail.push({ tanggal: a.tanggal, status: a.status, keterangan: a.keterangan });
  });
  // Tambah Absen Malam dari tabel terpisah
  let absenMalamList = (db.absen_malam || []).filter(a => a.santri_id === santri.id);
  if (req.query.dari) absenMalamList = absenMalamList.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) absenMalamList = absenMalamList.filter(a => a.tanggal <= req.query.sampai);
  if (absenMalamList.length) {
    rekap['Absen Malam'] = { H: 0, I: 0, S: 0, A: 0, detail: [] };
    absenMalamList.forEach(a => {
      rekap['Absen Malam'][a.status] = (rekap['Absen Malam'][a.status] || 0) + 1;
      rekap['Absen Malam'].detail.push({ tanggal: a.tanggal, status: a.status, keterangan: a.keterangan });
    });
  }
  // Tambah Absen Sekolah dari tabel terpisah
  let absenSekolahList = (db.absen_sekolah || []).filter(a => a.santri_id === santri.id);
  if (req.query.dari) absenSekolahList = absenSekolahList.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) absenSekolahList = absenSekolahList.filter(a => a.tanggal <= req.query.sampai);
  if (absenSekolahList.length) {
    rekap['Sekolah Formal'] = { H: 0, I: 0, S: 0, A: 0, detail: [] };
    absenSekolahList.forEach(a => {
      rekap['Sekolah Formal'][a.status] = (rekap['Sekolah Formal'][a.status] || 0) + 1;
      rekap['Sekolah Formal'].detail.push({ tanggal: a.tanggal, status: a.status, keterangan: a.keterangan });
    });
  }
  res.json({
    santri: { ...santri, kamar_nama: kamar ? kamar.nama : '-' },
    periode: { dari: req.query.dari || '-', sampai: req.query.sampai || '-' },
    rekap,
    pelanggaran: pelanggaranList.sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    catatan_guru: catatanList.map(c => {
      const u = db.users.find(x => x.id === c.created_by);
      return { ...c, guru_nama: u ? u.nama : '-' };
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal))
  });
});

// ── Export Raport PDF ───────────────────────────────────
app.get('/api/raport/:santri_id/pdf', authenticate, (req, res) => {
  const santri = db.santri.find(s => s.id == req.params.santri_id);
  if (!santri) return res.status(404).json({ message: 'Santri tidak ditemukan' });
  const kamar = db.kamar.find(k => k.id === santri.kamar_id);
  let absensiList = db.absensi.filter(a => a.santri_id === santri.id);
  if (req.query.dari) absensiList = absensiList.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) absensiList = absensiList.filter(a => a.tanggal <= req.query.sampai);
  let pelanggaranList = (db.pelanggaran || []).filter(p => p.santri_id === santri.id);
  if (req.query.dari) pelanggaranList = pelanggaranList.filter(p => p.tanggal >= req.query.dari);
  if (req.query.sampai) pelanggaranList = pelanggaranList.filter(p => p.tanggal <= req.query.sampai);
  let catatanList = (db.catatan_guru || []).filter(c => c.santri_id === santri.id);
  if (req.query.dari) catatanList = catatanList.filter(c => c.tanggal >= req.query.dari);
  if (req.query.sampai) catatanList = catatanList.filter(c => c.tanggal <= req.query.sampai);
  // Group by kegiatan
  const rekap = {};
  absensiList.forEach(a => {
    const kg = db.kegiatan.find(k => k.id === a.kegiatan_id);
    const nama = kg ? kg.nama : 'Lainnya';
    if (!rekap[nama]) rekap[nama] = { H: 0, I: 0, S: 0, A: 0 };
    rekap[nama][a.status]++;
  });
  const statusMap = { H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alfa' };
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=raport-' + santri.nama.replace(/\s+/g, '-') + '.pdf');
  doc.pipe(res);
  // Header
  const data_settings = loadDB();
  const appName = (data_settings.settings && data_settings.settings.app_name) || 'Pesantren';
  doc.fontSize(18).font('Helvetica-Bold').text('RAPORT SANTRI', { align: 'center' });
  doc.fontSize(11).font('Helvetica').text(appName, { align: 'center' });
  doc.moveDown(1);
  // Info santri
  doc.fontSize(10).font('Helvetica-Bold').text('Nama: ', 40, doc.y, { continued: true }).font('Helvetica').text(santri.nama);
  doc.font('Helvetica-Bold').text('Kamar: ', 40, doc.y, { continued: true }).font('Helvetica').text(kamar ? kamar.nama : '-');
  doc.font('Helvetica-Bold').text('Kelas Diniyyah: ', 40, doc.y, { continued: true }).font('Helvetica').text(santri.kelas_diniyyah || '-');
  doc.font('Helvetica-Bold').text('Kelompok Ngaji: ', 40, doc.y, { continued: true }).font('Helvetica').text(santri.kelompok_ngaji || '-');
  doc.font('Helvetica-Bold').text('Kelas Sekolah: ', 40, doc.y, { continued: true }).font('Helvetica').text(santri.kelas_sekolah || '-');
  doc.font('Helvetica-Bold').text('Periode: ', 40, doc.y, { continued: true }).font('Helvetica').text((req.query.dari || '-') + ' s/d ' + (req.query.sampai || '-'));
  doc.moveDown(1);
  // Tabel rekap kegiatan
  doc.fontSize(12).font('Helvetica-Bold').text('Rekap Kehadiran', 40);
  doc.moveDown(0.5);
  const colW = [130, 60, 60, 60, 60];
  const headers = ['Kegiatan', 'Hadir', 'Izin', 'Sakit', 'Alfa'];
  let y = doc.y;
  doc.fontSize(9).font('Helvetica-Bold');
  let x = 40;
  headers.forEach((h, i) => { doc.text(h, x, y, { width: colW[i] }); x += colW[i]; });
  doc.moveTo(40, y + 14).lineTo(410, y + 14).stroke();
  y += 18;
  doc.font('Helvetica').fontSize(9);
  Object.entries(rekap).forEach(([keg, r]) => {
    x = 40;
    [keg, r.H, r.I, r.S, r.A].forEach((cell, i) => { doc.text(String(cell), x, y, { width: colW[i] }); x += colW[i]; });
    y += 16;
  });
  // Total
  const totalH = Object.values(rekap).reduce((s, r) => s + r.H, 0);
  const totalI = Object.values(rekap).reduce((s, r) => s + r.I, 0);
  const totalS = Object.values(rekap).reduce((s, r) => s + r.S, 0);
  const totalA = Object.values(rekap).reduce((s, r) => s + r.A, 0);
  doc.font('Helvetica-Bold');
  x = 40;
  ['TOTAL', totalH, totalI, totalS, totalA].forEach((cell, i) => { doc.text(String(cell), x, y, { width: colW[i] }); x += colW[i]; });
  doc.moveDown(2);
  // Pelanggaran
  if (pelanggaranList.length) {
    doc.fontSize(12).font('Helvetica-Bold').text('Pelanggaran', 40);
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica');
    pelanggaranList.forEach((p, i) => {
      doc.text((i + 1) + '. [' + p.tanggal + '] ' + p.jenis + ' — ' + p.keterangan + (p.sanksi ? ' (Sanksi: ' + p.sanksi + ')' : ''), 40, doc.y, { width: 500 });
      doc.moveDown(0.3);
    });
  } else {
    doc.fontSize(10).font('Helvetica').text('Tidak ada pelanggaran.', 40);
  }
  doc.moveDown(1);
  // Catatan Guru
  doc.fontSize(12).font('Helvetica-Bold').text('Catatan Guru', 40);
  doc.moveDown(0.5);
  if (catatanList.length) {
    doc.fontSize(8).font('Helvetica');
    catatanList.forEach((c, i) => {
      const guru = db.users.find(u => u.id === c.created_by);
      doc.font('Helvetica-Bold').text((i + 1) + '. [' + c.tanggal + '] ' + (c.judul || c.kategori) + ' — oleh ' + (guru ? guru.nama : '-'), 40, doc.y, { width: 500 });
      doc.font('Helvetica').text(c.isi, 55, doc.y, { width: 485 });
      doc.moveDown(0.4);
    });
  } else {
    doc.fontSize(10).font('Helvetica').text('Tidak ada catatan.', 40);
  }
  doc.end();
});

// ── Settings ──────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const data = loadDB();
  res.json(data.settings || { app_name: 'Pesantren Absensi', logo: '' });
});
app.put('/api/settings', authenticate, requireAdmin, (req, res) => {
  const data = loadDB();
  data.settings = { ...data.settings, ...req.body };
  saveDB(data);
  res.json({ message: 'Pengaturan disimpan', settings: data.settings });
});
app.post('/api/settings/logo', authenticate, requireAdmin, (req, res) => {
  const { logo } = req.body;
  if (!logo) return res.status(400).json({ message: 'Logo wajib' });
  const data = loadDB();
  if (!data.settings) data.settings = { app_name: 'Pesantren Absensi' };
  data.settings.logo = logo;
  saveDB(data);
  res.json({ message: 'Logo diupdate' });
});
app.post('/api/settings/background', authenticate, requireAdmin, (req, res) => {
  const { background } = req.body;
  if (!background) return res.status(400).json({ message: 'Background wajib' });
  const data = loadDB();
  if (!data.settings) data.settings = { app_name: 'Pesantren Absensi' };
  data.settings.background = background;
  saveDB(data);
  res.json({ message: 'Background diupdate' });
});
app.post('/api/settings/dashboard-bg', authenticate, requireAdmin, (req, res) => {
  const { dashboard_bg } = req.body;
  if (!dashboard_bg) return res.status(400).json({ message: 'Background dashboard wajib' });
  const data = loadDB();
  if (!data.settings) data.settings = { app_name: 'Pesantren Absensi' };
  data.settings.dashboard_bg = dashboard_bg;
  saveDB(data);
  res.json({ message: 'Background dashboard diupdate' });
});
app.post('/api/settings/delete', authenticate, requireAdmin, (req, res) => {
  const { field } = req.body;
  const allowed = ['logo', 'background', 'dashboard_bg'];
  if (!allowed.includes(field)) return res.status(400).json({ message: 'Field tidak valid' });
  const data = loadDB();
  if (data.settings) delete data.settings[field];
  saveDB(data);
  res.json({ message: field + ' dihapus' });
});

// File upload endpoints (multer)
app.post('/api/settings/logo-file', authenticate, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File tidak ada' });
  const data = loadDB();
  if (!data.settings) data.settings = { app_name: 'Pesantren Absensi' };
  data.settings.logo = 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64');
  saveDB(data);
  res.json({ message: 'Logo diupload' });
});
app.post('/api/settings/bg-file', authenticate, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File tidak ada' });
  const data = loadDB();
  if (!data.settings) data.settings = { app_name: 'Pesantren Absensi' };
  data.settings.background = 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64');
  saveDB(data);
  res.json({ message: 'Background login diupload' });
});
app.post('/api/settings/dash-bg-file', authenticate, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File tidak ada' });
  const data = loadDB();
  if (!data.settings) data.settings = { app_name: 'Pesantren Absensi' };
  data.settings.dashboard_bg = 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64');
  saveDB(data);
  res.json({ message: 'Background menu diupload' });
});

// ── Export PDF ──────────────────────────────────────────
app.get('/api/export/pdf', authenticate, (req, res) => {
  let list = db.absensi;
  if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
  if (req.query.kegiatan_id) list = list.filter(a => a.kegiatan_id == req.query.kegiatan_id);
  const santriFilters = ['kamar_id', 'kelas_diniyyah', 'kelompok_ngaji', 'kelompok_ngaji_malam', 'jenis_bakat', 'kelas_sekolah'];
  santriFilters.forEach(f => {
    if (req.query[f]) {
      const santriIds = db.santri.filter(s => String(s[f]) === String(req.query[f])).map(s => s.id);
      list = list.filter(a => santriIds.includes(a.santri_id));
    }
  });

  const data = list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    const kg = db.kegiatan.find(x => x.id === a.kegiatan_id);
    return { tanggal: a.tanggal, nama: s ? s.nama : '-', kamar: k ? k.nama : '-', kegiatan: kg ? kg.nama : '-', status: a.status, keterangan: a.keterangan };
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  const statusMap = { H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alfa' };

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=rekap-absensi.pdf');
  doc.pipe(res);

  // Header
  const data_settings = loadDB();
  const appName = (data_settings.settings && data_settings.settings.app_name) || 'Pesantren';
  doc.fontSize(18).font('Helvetica-Bold').text('REKAP ABSENSI SANTRI', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(appName, { align: 'center' });
  doc.moveDown(0.5);
  const filterText = [];
  if (req.query.dari) filterText.push(`Dari: ${req.query.dari}`);
  if (req.query.sampai) filterText.push(`Sampai: ${req.query.sampai}`);
  if (req.query.kegiatan_id) {
    const kg = db.kegiatan.find(x => x.id == req.query.kegiatan_id);
    if (kg) filterText.push(`Kegiatan: ${kg.nama}`);
  }
  if (filterText.length) doc.fontSize(9).text(filterText.join(' | '), { align: 'center' });
  doc.moveDown(1);

  // Table header
  const colWidths = [70, 120, 80, 110, 60, 100];
  const headers = ['Tanggal', 'Santri', 'Kamar', 'Kegiatan', 'Status', 'Keterangan'];
  let y = doc.y;
  doc.fontSize(8).font('Helvetica-Bold');
  let x = 40;
  headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i] }); x += colWidths[i]; });
  doc.moveTo(40, y + 15).lineTo(550, y + 15).stroke();
  y += 20;

  // Table rows
  doc.font('Helvetica').fontSize(8);
  data.forEach((row, idx) => {
    if (y > 750) { doc.addPage(); y = 40; }
    x = 40;
    const rowData = [row.tanggal, row.nama, row.kamar, row.kegiatan, statusMap[row.status] || row.status, row.keterangan || '-'];
    rowData.forEach((cell, i) => { doc.text(String(cell), x, y, { width: colWidths[i] }); x += colWidths[i]; });
    y += 16;
  });

  // Summary
  doc.moveDown(2);
  doc.fontSize(9).font('Helvetica-Bold').text('Ringkasan:', 40, y + 20);
  const hadir = data.filter(r => r.status === 'H').length;
  const izin = data.filter(r => r.status === 'I').length;
  const sakit = data.filter(r => r.status === 'S').length;
  const alfa = data.filter(r => r.status === 'A').length;
  doc.font('Helvetica').text(`Hadir: ${hadir} | Izin: ${izin} | Sakit: ${sakit} | Alfa: ${alfa} | Total: ${data.length}`, 40);

  doc.end();
});

// ── Cleanup Orphan Absensi ─────────────────────────────
app.post('/api/maintenance/cleanup-absensi', authenticate, requireAdmin, (req, res) => {
  const validKegiatanIds = new Set(db.kegiatan.map(k => k.id));
  const before = db.absensi.length;
  db.absensi = db.absensi.filter(a => validKegiatanIds.has(a.kegiatan_id));
  const removed = before - db.absensi.length;
  saveDB(db);
  res.json({ message: `Bersihkan ${removed} data absensi orphan`, removed, remaining: db.absensi.length });
});

// ── Rekap Ustadz (Session-based) ────────────────────────
app.get('/api/rekap-ustadz', authenticate, (req, res) => {
  const users = db.users.filter(u => u.role !== 'wali');
  if (!db.absensi_sesi) db.absensi_sesi = [];
  let sesiList = db.absensi_sesi;
  if (req.query.dari) sesiList = sesiList.filter(s => s.tanggal >= req.query.dari);
  if (req.query.sampai) sesiList = sesiList.filter(s => s.tanggal <= req.query.sampai);
  if (req.query.user_id) {
    const targetUser = db.users.find(u => u.id == req.query.user_id);
    if (targetUser) sesiList = sesiList.filter(s => s.ustadz_username === targetUser.username);
  }
  const result = users.map(u => {
    const userSesi = sesiList.filter(s => s.ustadz_username === u.username);
    // Per kegiatan breakdown
    const perKegiatan = {};
    userSesi.forEach(s => {
      let namaKeg = 'Lainnya';
      if (s.kegiatan_nama) namaKeg = s.kegiatan_nama;
      else { const kg = db.kegiatan.find(k => k.id === s.kegiatan_id); if (kg) namaKeg = kg.nama; }
      if (!perKegiatan[namaKeg]) perKegiatan[namaKeg] = 0;
      perKegiatan[namaKeg]++;
    });
    // Per tanggal
    const perTanggal = {};
    userSesi.forEach(s => {
      if (!perTanggal[s.tanggal]) perTanggal[s.tanggal] = 0;
      perTanggal[s.tanggal]++;
    });
    const total = userSesi.length;
    const aktifDays = Object.keys(perTanggal).length;
    return {
      user_id: u.id, nama: u.nama, username: u.username, role: u.role,
      total_sesi: total, aktif_days: aktifDays, per_kegiatan: perKegiatan
    };
  }).filter(r => r.total_sesi > 0 || !req.query.user_id);
  res.json(result.sort((a, b) => b.total_sesi - a.total_sesi));
});

app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
