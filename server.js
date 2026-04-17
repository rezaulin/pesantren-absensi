const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pesantren-secret-key';
const DB_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── JSON Database ──────────────────────────────────────
function loadDB() {
  if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  return { users: [], kamar: [], santri: [], absensi: [], pengumuman: [], kegiatan: [] };
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
if (!db.kegiatan || db.kegiatan.length === 0) {
  db.kegiatan = [
    { id: 1, nama: 'Ngaji Pagi', created_at: new Date().toISOString() },
    { id: 2, nama: "Ngaji Qur'an Siang", created_at: new Date().toISOString() },
    { id: 3, nama: 'Bakat', created_at: new Date().toISOString() },
    { id: 4, nama: 'Madrasah Diniyyah', created_at: new Date().toISOString() },
    { id: 5, nama: 'Ngaji Malam', created_at: new Date().toISOString() },
  ];
  saveDB(db);
}

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
  res.json(list.map(s => {
    const k = db.kamar.find(x => x.id === s.kamar_id);
    return { ...s, kamar_nama: k ? k.nama : '-' };
  }));
});
app.post('/api/santri', authenticate, requireAdmin, (req, res) => {
  const { nama, kamar_id, status } = req.body;
  if (!nama || !kamar_id) return res.status(400).json({ message: 'Nama & kamar wajib' });
  const s = { id: nextId(db.santri), nama, kamar_id: parseInt(kamar_id), status: status || 'aktif', created_at: new Date().toISOString() };
  db.santri.push(s); saveDB(db); res.json(s);
});
app.put('/api/santri/:id', authenticate, requireAdmin, (req, res) => {
  const s = db.santri.find(x => x.id == req.params.id);
  if (!s) return res.status(404).json({ message: 'Santri tidak ditemukan' });
  if (req.body.nama) s.nama = req.body.nama;
  if (req.body.kamar_id) s.kamar_id = parseInt(req.body.kamar_id);
  if (req.body.status) s.status = req.body.status;
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
  if (req.query.kamar_id) {
    const santriIds = db.santri.filter(s => s.kamar_id == req.query.kamar_id).map(s => s.id);
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
  const { tanggal, kegiatan_id, items } = req.body;
  if (!tanggal || !kegiatan_id || !items) return res.status(400).json({ message: 'Data tidak lengkap (tanggal, kegiatan_id, items wajib)' });
  items.forEach(item => {
    const existing = db.absensi.find(a => a.santri_id === item.santri_id && a.tanggal === tanggal && a.kegiatan_id == kegiatan_id);
    if (existing) { existing.status = item.status; existing.keterangan = item.keterangan || ''; existing.recorded_by = req.user.id; }
    else db.absensi.push({ id: nextId(db.absensi), santri_id: item.santri_id, kegiatan_id: parseInt(kegiatan_id), tanggal, status: item.status, keterangan: item.keterangan || '', recorded_by: req.user.id, created_at: new Date().toISOString() });
  });
  saveDB(db); res.json({ message: 'Absensi tersimpan' });
});

// ── Rekap ──────────────────────────────────────────────
app.get('/api/rekap', authenticate, (req, res) => {
  let list = db.absensi;
  if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
  if (req.query.kegiatan_id) list = list.filter(a => a.kegiatan_id == req.query.kegiatan_id);
  if (req.query.kamar_id) {
    const santriIds = db.santri.filter(s => s.kamar_id == req.query.kamar_id).map(s => s.id);
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

// ── Export PDF ──────────────────────────────────────────
app.get('/api/export/pdf', authenticate, (req, res) => {
  let list = db.absensi;
  if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
  if (req.query.kegiatan_id) list = list.filter(a => a.kegiatan_id == req.query.kegiatan_id);
  if (req.query.kamar_id) {
    const santriIds = db.santri.filter(s => s.kamar_id == req.query.kamar_id).map(s => s.id);
    list = list.filter(a => santriIds.includes(a.santri_id));
  }

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

app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
