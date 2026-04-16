/**
 * ============================================
 * APP.JS - ROUTER UTAMA APLIKASI SPA
 * ============================================
 * File ini menangani navigasi antar halaman dalam aplikasi
 * Single Page Application (SPA) - semua halaman dalam satu HTML
 * Router akan menampilkan halaman berdasarkan hash URL
 */

// State untuk menyimpan halaman aktif saat ini
let currentPage = 'dashboard';

// Daftar halaman yang tersedia dalam aplikasi
const pages = {
  dashboard: 'Dashboard',
  absensi: 'Absensi',
  rekap: 'Rekap Absensi',
  santri: 'Data Santri',
  kamar: 'Data Kamar',
  pengaturan: 'Pengaturan'
};

/**
 * Fungsi utama untuk me-render aplikasi
 * Dipanggil saat aplikasi dimuat dan setelah login berhasil
 * Mengecek autentikasi, lalu menampilkan halaman yang sesuai
 */
async function renderApp() {
  const app = document.getElementById('app');
  const loadingScreen = document.getElementById('loadingScreen');

  try {
    // Cek apakah user sudah login
    const isLoggedIn = await loadCurrentUser();

    if (!isLoggedIn) {
      // Jika belum login, tampilkan halaman login
      app.innerHTML = renderLoginPage();
      // Sembunyikan loading screen
      if (loadingScreen) loadingScreen.style.display = 'none';
      return;
    }

    // Jika sudah login, tampilkan layout utama aplikasi
    app.innerHTML = renderAppLayout();

    // Sembunyikan loading screen
    if (loadingScreen) loadingScreen.style.display = 'none';

    // Navigasi ke halaman yang dipilih (dari hash URL atau default ke dashboard)
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);

  } catch (error) {
    console.error('Error rendering app:', error);
    // Jika error, tampilkan halaman login sebagai fallback
    app.innerHTML = renderLoginPage();
    if (loadingScreen) loadingScreen.style.display = 'none';
  }
}

/**
 * Render layout utama aplikasi (header + main content)
 * Struktur: Header dengan judul dan tombol logout, lalu area konten
 * 
 * @returns {string} HTML untuk layout utama
 */
function renderAppLayout() {
  const user = getCurrentUser();
  const userName = user ? user.nama : 'User';

  return `
    <div class="app-container">
      <!-- Header aplikasi dengan judul dan tombol logout -->
      <header class="app-header">
        <div class="header-content">
          <div class="header-title">
            <span class="material-icons">mosque</span>
            <span>Absensi Pesantren</span>
          </div>
          <div class="header-actions">
            <span style="font-size: 14px; margin-right: 8px;">${userName}</span>
            <button class="btn btn-icon" onclick="logout()" title="Logout">
              <span class="material-icons">logout</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Area konten utama - halaman akan di-render di sini -->
      <main class="app-main" id="mainContent">
        <!-- Konten halaman akan dimuat di sini -->
      </main>
    </div>
  `;
}

/**
 * Fungsi navigasi ke halaman tertentu
 * Mengubah hash URL dan me-render halaman yang sesuai
 * 
 * @param {string} page - Nama halaman tujuan
 */
function navigateTo(page) {
  // Validasi halaman - pastikan halaman ada
  if (!pages[page]) {
    console.error(`Halaman "${page}" tidak ditemukan`);
    page = 'dashboard';
  }

  // Update state dan URL hash
  currentPage = page;
  window.location.hash = page;

  // Render halaman yang sesuai
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) {
    console.error('Element mainContent tidak ditemukan');
    return;
  }

  // Tampilkan loading state
  mainContent.innerHTML = '<div class="loading-spinner" style="margin: 50px auto;"></div>';

  // Render halaman berdasarkan nama
  switch (page) {
    case 'dashboard':
      renderDashboard(mainContent);
      break;
    case 'absensi':
      renderAbsensiPage(mainContent);
      break;
    case 'rekap':
      renderRekapPage(mainContent);
      break;
    case 'santri':
      renderSantriPage(mainContent);
      break;
    case 'kamar':
      renderKamarPage(mainContent);
      break;
    case 'pengaturan':
      renderPengaturanPage(mainContent);
      break;
    default:
      renderDashboard(mainContent);
  }
}

/**
 * Render halaman Data Santri
 * Menampilkan daftar semua santri dengan opsi tambah/edit/hapus
 * 
 * @param {HTMLElement} container - Element untuk me-render konten
 */
async function renderSantriPage(container) {
  try {
    // Ambil data santri dari API
    const response = await SantriAPI.getAll();
    const santriList = response.data || [];

    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
          <span class="material-icons">arrow_back</span>
        </button>
        <h1>Data Santri</h1>
        <button class="btn btn-primary" onclick="showTambahSantriForm()">
          <span class="material-icons">add</span>
          Tambah
        </button>
      </div>

      <div class="card">
        <div class="card-body">
          ${santriList.length === 0 
            ? '<p style="text-align: center; color: var(--text-secondary);">Belum ada data santri</p>'
            : santriList.map(santri => `
              <div class="santri-item">
                <div class="santri-info">
                  <div class="nama">${santri.nama}</div>
                  <div class="nis">NIS: ${santri.nis} | ${santri.nama_asrama || 'Belum ada kamar'}</div>
                </div>
                <div class="santri-actions">
                  <button class="btn btn-secondary btn-icon" onclick="editSantri(${santri.id})" title="Edit">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn btn-danger btn-icon" onclick="hapusSantri(${santri.id}, '${santri.nama}')" title="Hapus">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
          <span class="material-icons">arrow_back</span>
        </button>
        <h1>Data Santri</h1>
      </div>
      <div class="alert alert-error">Gagal memuat data: ${error.message}</div>
    `;
  }
}

/**
 * Render halaman Data Kamar
 * Menampilkan daftar semua kamar dengan jumlah santri
 * 
 * @param {HTMLElement} container - Element untuk me-render konten
 */
async function renderKamarPage(container) {
  try {
    // Ambil data kamar dari API
    const response = await KamarAPI.getAll();
    const kamarList = response.data || [];

    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
          <span class="material-icons">arrow_back</span>
        </button>
        <h1>Data Kamar</h1>
        <button class="btn btn-primary" onclick="showTambahKamarForm()">
          <span class="material-icons">add</span>
          Tambah
        </button>
      </div>

      <div class="card">
        <div class="card-body">
          ${kamarList.length === 0 
            ? '<p style="text-align: center; color: var(--text-secondary);">Belum ada data kamar</p>'
            : kamarList.map(kamar => `
              <div class="kamar-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div>
                  <div style="font-weight: 500;">${kamar.nama_asrama}</div>
                  <div style="font-size: 14px; color: var(--text-secondary);">Kamar ${kamar.nomor_kamar} | Kapasitas: ${kamar.kapasitas}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="badge" style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 12px;">
                    ${kamar.jumlah_santri} santri
                  </span>
                  <button class="btn btn-secondary btn-icon" onclick="editKamar(${kamar.id})" title="Edit">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn btn-danger btn-icon" onclick="hapusKamar(${kamar.id}, '${kamar.nomor_kamar}')" title="Hapus">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
          <span class="material-icons">arrow_back</span>
        </button>
        <h1>Data Kamar</h1>
      </div>
      <div class="alert alert-error">Gagal memuat data: ${error.message}</div>
    `;
  }
}

/**
 * Render halaman Pengaturan
 * Menampilkan informasi akun dan pengaturan aplikasi
 * 
 * @param {HTMLElement} container - Element untuk me-render konten
 */
function renderPengaturanPage(container) {
  const user = getCurrentUser();

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
        <span class="material-icons">arrow_back</span>
      </button>
      <h1>Pengaturan</h1>
    </div>

    <div class="card">
      <div class="card-header">Informasi Akun</div>
      <div class="card-body">
        <p><strong>Nama:</strong> ${user?.nama || '-'}</p>
        <p><strong>Username:</strong> ${user?.username || '-'}</p>
        <p><strong>Role:</strong> ${user?.role || '-'}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Tentang Aplikasi</div>
      <div class="card-body">
        <p><strong>Sistem Absensi Pesantren v1.0</strong></p>
        <p>Aplikasi untuk mengelola absensi santri di pesantren.</p>
        <p>Dibuat dengan Node.js, Express, PostgreSQL, dan JavaScript.</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Login Default</div>
      <div class="card-body">
        <p><strong>Admin:</strong> admin / admin123</p>
        <p><strong>Pengurus:</strong> ahmad / pengurus123</p>
      </div>
    </div>
  `;
}

/**
 * Placeholder functions untuk CRUD Santri
 * Fungsi-fungsi ini bisa dikembangkan lebih lanjut
 */

/**
 * Tampilkan form tambah santri (placeholder)
 */
function showTambahSantriForm() {
  const nis = prompt('Masukkan NIS:');
  if (!nis) return;
  
  const nama = prompt('Masukkan Nama Santri:');
  if (!nama) return;

  SantriAPI.create({ nis, nama, status: 'aktif' })
    .then(() => {
      alert('Santri berhasil ditambahkan!');
      navigateTo('santri');
    })
    .catch(err => alert('Gagal: ' + err.message));
}

/**
 * Edit data santri (placeholder)
 * @param {number} id - ID santri
 */
async function editSantri(id) {
  try {
    const response = await SantriAPI.getById(id);
    const santri = response.data;
    
    const nama = prompt('Edit Nama:', santri.nama);
    if (!nama) return;

    await SantriAPI.update(id, { nama });
    alert('Data santri berhasil diupdate!');
    navigateTo('santri');
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
}

/**
 * Hapus santri (placeholder)
 * @param {number} id - ID santri
 * @param {string} nama - Nama santri untuk konfirmasi
 */
async function hapusSantri(id, nama) {
  if (!confirm(`Hapus santri "${nama}"? Data absensi juga akan terhapus.`)) return;
  
  try {
    await SantriAPI.delete(id);
    alert('Santri berhasil dihapus!');
    navigateTo('santri');
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
}

/**
 * Placeholder functions untuk CRUD Kamar
 */

/**
 * Tampilkan form tambah kamar (placeholder)
 */
function showTambahKamarForm() {
  const nomorKamar = prompt('Masukkan Nomor Kamar (contoh: A1):');
  if (!nomorKamar) return;
  
  const namaAsrama = prompt('Masukkan Nama Asrama:');
  if (!namaAsrama) return;

  const kapasitas = prompt('Kapasitas (default: 10):', '10');

  KamarAPI.create({ nomor_kamar: nomorKamar, nama_asrama: namaAsrama, kapasitas: parseInt(kapasitas) || 10 })
    .then(() => {
      alert('Kamar berhasil ditambahkan!');
      navigateTo('kamar');
    })
    .catch(err => alert('Gagal: ' + err.message));
}

/**
 * Edit data kamar (placeholder)
 * @param {number} id - ID kamar
 */
async function editKamar(id) {
  try {
    const response = await KamarAPI.getById(id);
    const kamar = response.data;
    
    const kapasitas = prompt('Edit Kapasitas:', kamar.kapasitas);
    if (!kapasitas) return;

    await KamarAPI.update(id, { kapasitas: parseInt(kapasitas) });
    alert('Data kamar berhasil diupdate!');
    navigateTo('kamar');
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
}

/**
 * Hapus kamar (placeholder)
 * @param {number} id - ID kamar
 * @param {string} nomorKamar - Nomor kamar untuk konfirmasi
 */
async function hapusKamar(id, nomorKamar) {
  if (!confirm(`Hapus kamar "${nomorKamar}"?`)) return;
  
  try {
    await KamarAPI.delete(id);
    alert('Kamar berhasil dihapus!');
    navigateTo('kamar');
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
}

// Handler untuk perubahan hash URL (browser back/forward)
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  if (hash !== currentPage) {
    navigateTo(hash);
  }
});

// Jalankan renderApp saat halaman dimuat
document.addEventListener('DOMContentLoaded', renderApp);
