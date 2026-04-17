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
  return { users: [], kamar: [], santri: [], absensi: [], pengumuman: [] };
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
    return res.status(401).json({ message: 'Username atau password salah' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, nama: user.nama }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, nama: user.nama } });
});

app.get('/api/me', authenticate, (req, res) => res.json(req.user));

// ── Dashboard ──────────────────────────────────────────
app.get('/api/dashboard', authenticate, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const hadir = db.absensi.filter(a => a.tanggal === today && a.status === 'H').length;
  const izin = db.absensi.filter(a => a.tanggal === today && (a.status === 'I' || a.status === 'S')).length;
  const alfa = db.absensi.filter(a => a.tanggal === today && a.status === 'A').length;
  res.json({ totalSantri: db.santri.filter(s => s.status === 'aktif').length, hadirHariIni: hadir, izinHariIni: izin, alfaHariIni: alfa });
});

// ── Users ──────────────────────────────────────────────
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  res.json(db.users.map(u => ({ id: u.id, username: u.username, role: u.role, nama: u.nama, created_at: u.created_at })));
});
app.post('/api/users', authenticate, requireAdmin, (req, res) => {
  const { username, password, role, nama } = req.body;
  if (!username || !password || !nama) return res.status(400).json({ message: 'Field wajib' });
  if (db.users.find(u => u.username === username)) return res.status(400).json({ message: 'Username sudah ada' });
  const user = { id: nextId(db.users), username, password_hash: bcrypt.hashSync(password, 10), role: role || 'ustadz', nama, created_at: new Date().toISOString() };
  db.users.push(user); saveDB(db);
  res.json({ id: user.id, username: user.username, role: user.role, nama: user.nama });
});
app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).json({ message: 'User tidak ada' });
  if (req.body.nama) user.nama = req.body.nama;
  if (req.body.role) user.role = req.body.role;
  if (req.body.password) user.password_hash = bcrypt.hashSync(req.body.password, 10);
  saveDB(db); res.json({ message: 'User diupdate' });
});
app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ message: 'Tidak bisa hapus diri sendiri' });
  db.users = db.users.filter(u => u.id != req.params.id); saveDB(db);
  res.json({ message: 'User dihapus' });
});

// ── Kamar ──────────────────────────────────────────────
app.get('/api/kamar', authenticate, (req, res) => {
  res.json(db.kamar.map(k => ({ ...k, jumlah_santri: db.santri.filter(s => s.kamar_id === k.id && s.status === 'aktif').length })));
});
app.post('/api/kamar', authenticate, requireAdmin, (req, res) => {
  const { nama, kapasitas, pengurus } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama wajib' });
  const k = { id: nextId(db.kamar), nama, kapasitas: kapasitas || 0, pengurus: pengurus || '' };
  db.kamar.push(k); saveDB(db); res.json(k);
});
app.put('/api/kamar/:id', authenticate, requireAdmin, (req, res) => {
  const k = db.kamar.find(x => x.id == req.params.id);
  if (!k) return res.status(404).json({ message: 'Kamar tidak ada' });
  Object.assign(k, req.body); saveDB(db); res.json({ message: 'Kamar diupdate' });
});
app.delete('/api/kamar/:id', authenticate, requireAdmin, (req, res) => {
  const hasSantri = db.santri.some(s => s.kamar_id == req.params.id && s.status === 'aktif');
  if (hasSantri) return res.status(400).json({ message: 'Kamar masih ada santri' });
  db.kamar = db.kamar.filter(k => k.id != req.params.id); saveDB(db);
  res.json({ message: 'Kamar dihapus' });
});

// ── Santri ─────────────────────────────────────────────
app.get('/api/santri', authenticate, (req, res) => {
  let list = db.santri;
  if (req.query.kamar_id) list = list.filter(s => s.kamar_id == req.query.kamar_id);
  if (req.query.status) list = list.filter(s => s.status === req.query.status);
  else list = list.filter(s => s.status === 'aktif');
  res.json(list.map(s => {
    const k = db.kamar.find(x => x.id === s.kamar_id);
    return { ...s, kamar_nama: k ? k.nama : '-' };
  }).sort((a, b) => a.nama.localeCompare(b.nama)));
});
app.get('/api/santri/:id', authenticate, (req, res) => {
  const s = db.santri.find(x => x.id == req.params.id);
  if (!s) return res.status(404).json({ message: 'Santri tidak ada' });
  const k = db.kamar.find(x => x.id === s.kamar_id);
  res.json({ ...s, kamar_nama: k ? k.nama : '-' });
});
app.post('/api/santri', authenticate, requireAdmin, (req, res) => {
  const { nama, kamar_id, status } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama wajib' });
  const s = { id: nextId(db.santri), nama, kamar_id: kamar_id || null, status: status || 'aktif', created_at: new Date().toISOString() };
  db.santri.push(s); saveDB(db); res.json(s);
});
app.put('/api/santri/:id', authenticate, requireAdmin, (req, res) => {
  const s = db.santri.find(x => x.id == req.params.id);
  if (!s) return res.status(404).json({ message: 'Santri tidak ada' });
  Object.assign(s, req.body); saveDB(db); res.json({ message: 'Santri diupdate' });
});
app.delete('/api/santri/:id', authenticate, requireAdmin, (req, res) => {
  db.santri = db.santri.filter(s => s.id != req.params.id); saveDB(db);
  res.json({ message: 'Santri dihapus' });
});

// ── Absensi ────────────────────────────────────────────
app.get('/api/absensi', authenticate, (req, res) => {
  let list = db.absensi;
  if (req.query.tanggal) list = list.filter(a => a.tanggal === req.query.tanggal);
  if (req.query.kamar_id) {
    const santriIds = db.santri.filter(s => s.kamar_id == req.query.kamar_id).map(s => s.id);
    list = list.filter(a => santriIds.includes(a.santri_id));
  }
  res.json(list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    const u = db.users.find(x => x.id === a.recorded_by);
    return { ...a, santri_nama: s ? s.nama : '-', kamar_nama: k ? k.nama : '-', recorded_by_nama: u ? u.nama : '-' };
  }));
});
app.post('/api/absensi/bulk', authenticate, (req, res) => {
  const { tanggal, items } = req.body;
  if (!tanggal || !items) return res.status(400).json({ message: 'Data tidak lengkap' });
  items.forEach(item => {
    const existing = db.absensi.find(a => a.santri_id === item.santri_id && a.tanggal === tanggal);
    if (existing) { existing.status = item.status; existing.keterangan = item.keterangan || ''; existing.recorded_by = req.user.id; }
    else db.absensi.push({ id: nextId(db.absensi), santri_id: item.santri_id, tanggal, status: item.status, keterangan: item.keterangan || '', recorded_by: req.user.id, created_at: new Date().toISOString() });
  });
  saveDB(db); res.json({ message: 'Absensi tersimpan' });
});

// ── Rekap ──────────────────────────────────────────────
app.get('/api/rekap', authenticate, (req, res) => {
  let list = db.absensi;
  if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
  if (req.query.kamar_id) {
    const santriIds = db.santri.filter(s => s.kamar_id == req.query.kamar_id).map(s => s.id);
    list = list.filter(a => santriIds.includes(a.santri_id));
  }
  res.json(list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    return { tanggal: a.tanggal, nama: s ? s.nama : '-', kamar_nama: k ? k.nama : '-', status: a.status, keterangan: a.keterangan };
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

// ── Export PDF ──────────────────────────────────────────
app.get('/api/export/pdf', authenticate, (req, res) => {
  let list = db.absensi;
  if (req.query.dari) list = list.filter(a => a.tanggal >= req.query.dari);
  if (req.query.sampai) list = list.filter(a => a.tanggal <= req.query.sampai);
  if (req.query.kamar_id) {
    const santriIds = db.santri.filter(s => s.kamar_id == req.query.kamar_id).map(s => s.id);
    list = list.filter(a => santriIds.includes(a.santri_id));
  }

  const data = list.map(a => {
    const s = db.santri.find(x => x.id === a.santri_id);
    const k = s ? db.kamar.find(x => x.id === s.kamar_id) : null;
    return { tanggal: a.tanggal, nama: s ? s.nama : '-', kamar: k ? k.nama : '-', status: a.status, keterangan: a.keterangan };
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  const statusMap = { H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alfa' };

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=rekap-absensi.pdf');
  doc.pipe(res);

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('REKAP ABSENSI SANTRI', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Pesantren', { align: 'center' });
  doc.moveDown(0.5);
  const filterText = [];
  if (req.query.dari) filterText.push(`Dari: ${req.query.dari}`);
  if (req.query.sampai) filterText.push(`Sampai: ${req.query.sampai}`);
  if (filterText.length) doc.fontSize(9).text(filterText.join(' | '), { align: 'center' });
  doc.moveDown(1);

  // Table
  const tableTop = doc.y;
  const colX = [40, 120, 270, 370, 450];
  const headers = ['Tanggal', 'Nama Santri', 'Kamar', 'Status', 'Keterangan'];
  const colW = [80, 150, 100, 80, 120];

  // Header row
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: colW[i] }));
  doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).stroke();

  // Data rows
  doc.font('Helvetica').fontSize(8);
  let y = tableTop + 20;
  data.forEach((row, idx) => {
    if (y > 750) { doc.addPage(); y = 40; }
    if (idx % 2 === 0) { doc.rect(38, y - 3, 520, 16).fill('#f5f5f5').fillColor('black'); }
    doc.text(row.tanggal, colX[0], y, { width: colW[0] });
    doc.text(row.nama, colX[1], y, { width: colW[1] });
    doc.text(row.kamar, colX[2], y, { width: colW[2] });
    doc.text(statusMap[row.status] || row.status, colX[3], y, { width: colW[3] });
    doc.text(row.keterangan || '-', colX[4], y, { width: colW[4] });
    y += 18;
  });

  // Footer
  doc.moveTo(40, y + 5).lineTo(555, y + 5).stroke();
  doc.fontSize(8).text(`Total: ${data.length} data | Dibuat: ${new Date().toLocaleString('id-ID')}`, 40, y + 10, { align: 'center' });

  doc.end();
});

// ── Start ──────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log('Login: admin / admin123');
});
