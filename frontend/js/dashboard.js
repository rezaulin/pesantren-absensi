/**
 * ============================================
 * DASHBOARD.JS - HALAMAN UTAMA APLIKASI
 * ============================================
 * File ini menangani render halaman dashboard
 * Menampilkan statistik dan menu navigasi utama
 * Dashboard adalah halaman pertama yang dilihat setelah login
 */

/**
 * Render halaman dashboard
 * Menampilkan:
 * 1. Pesan selamat datang dengan nama user
 * 2. Statistik (total santri, kamar, absensi hari ini)
 * 3. Grid menu 8 ikon untuk navigasi ke fitur lain
 * 
 * @param {HTMLElement} container - Element DOM untuk me-render konten
 */
async function renderDashboard(container) {
  // Tampilkan loading state terlebih dahulu
  container.innerHTML = `
    <div class="dashboard">
      <div class="loading-spinner" style="margin: 50px auto;"></div>
    </div>
  `;

  try {
    // Ambil data statistik dari API
    const statistikResponse = await AbsensiAPI.getStatistik();
    const statistik = statistikResponse.data || {};

    // Ambil data user yang sedang login
    const user = getCurrentUser();
    const userName = user ? user.nama : 'User';

    // Hitung statistik absensi hari ini
    const absensiHariIni = statistik.hari_ini || [];
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlfa = 0;

    // Proses data statistik absensi
    absensiHariIni.forEach(item => {
      switch (item.status) {
        case 'HADIR':
          totalHadir += parseInt(item.jumlah);
          break;
        case 'SAKIT':
          totalSakit += parseInt(item.jumlah);
          break;
        case 'IZIN':
          totalIzin += parseInt(item.jumlah);
          break;
        case 'ALFA':
          totalAlfa += parseInt(item.jumlah);
          break;
      }
    });

    // Render konten dashboard
    container.innerHTML = `
      <div class="dashboard">
        <!-- Pesan Selamat Datang -->
        <div class="dashboard-welcome">
          <h2>Assalamu'alaikum, ${userName}</h2>
          <p>Selamat datang di Sistem Absensi Pesantren</p>
          <p style="font-size: 14px; color: var(--text-secondary);">
            ${formatDate(new Date())}
          </p>
        </div>

        <!-- Statistik Cards -->
        <div class="stat-cards">
          <div class="stat-card">
            <span class="material-icons">people</span>
            <div class="stat-value">${statistik.total_santri || 0}</div>
            <div class="stat-label">Total Santri</div>
          </div>
          <div class="stat-card">
            <span class="material-icons">hotel</span>
            <div class="stat-value">${statistik.total_kamar || 0}</div>
            <div class="stat-label">Total Kamar</div>
          </div>
          <div class="stat-card">
            <span class="material-icons">check_circle</span>
            <div class="stat-value">${totalHadir}</div>
            <div class="stat-label">Hadir Hari Ini</div>
          </div>
          <div class="stat-card">
            <span class="material-icons">sick</span>
            <div class="stat-value">${totalSakit}</div>
            <div class="stat-label">Sakit</div>
          </div>
        </div>

        <!-- Menu Grid - 8 ikon untuk navigasi -->
        <h3 style="margin-bottom: 16px; font-weight: 500;">Menu Utama</h3>
        <div class="menu-grid">
          <!-- Menu 1: Absen Malam -->
          <div class="menu-item" onclick="navigateToAbsensi(1)">
            <span class="material-icons">nightlight</span>
            <div class="menu-label">Absen Malam</div>
          </div>

          <!-- Menu 2: Absen Berjamaah -->
          <div class="menu-item" onclick="navigateToAbsensi(2)">
            <span class="material-icons">groups</span>
            <div class="menu-label">Berjamaah</div>
          </div>

          <!-- Menu 3: Absen Sakit Pagi -->
          <div class="menu-item" onclick="navigateToAbsensi(3)">
            <span class="material-icons">medical_services</span>
            <div class="menu-label">Sakit Pagi</div>
          </div>

          <!-- Menu 4: Absen Pengajian -->
          <div class="menu-item" onclick="navigateToAbsensi(4)">
            <span class="material-icons">menu_book</span>
            <div class="menu-label">Pengajian</div>
          </div>

          <!-- Menu 5: Rekap Absensi -->
          <div class="menu-item" onclick="navigateTo('rekap')">
            <span class="material-icons">assessment</span>
            <div class="menu-label">Rekap</div>
          </div>

          <!-- Menu 6: Data Santri -->
          <div class="menu-item" onclick="navigateTo('santri')">
            <span class="material-icons">school</span>
            <div class="menu-label">Data Santri</div>
          </div>

          <!-- Menu 7: Data Kamar -->
          <div class="menu-item" onclick="navigateTo('kamar')">
            <span class="material-icons">bed</span>
            <div class="menu-label">Data Kamar</div>
          </div>

          <!-- Menu 8: Pengaturan -->
          <div class="menu-item" onclick="navigateTo('pengaturan')">
            <span class="material-icons">settings</span>
            <div class="menu-label">Pengaturan</div>
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading dashboard:', error);
    // Tampilkan dashboard tanpa statistik jika API gagal
    const user = getCurrentUser();
    const userName = user ? user.nama : 'User';

    container.innerHTML = `
      <div class="dashboard">
        <div class="dashboard-welcome">
          <h2>Assalamu'alaikum, ${userName}</h2>
          <p>Selamat datang di Sistem Absensi Pesantren</p>
        </div>

        <div class="alert alert-error" style="margin-bottom: 16px;">
          Gagal memuat statistik. Silakan coba lagi.
        </div>

        <h3 style="margin-bottom: 16px; font-weight: 500;">Menu Utama</h3>
        <div class="menu-grid">
          <div class="menu-item" onclick="navigateToAbsensi(1)">
            <span class="material-icons">nightlight</span>
            <div class="menu-label">Absen Malam</div>
          </div>
          <div class="menu-item" onclick="navigateToAbsensi(2)">
            <span class="material-icons">groups</span>
            <div class="menu-label">Berjamaah</div>
          </div>
          <div class="menu-item" onclick="navigateToAbsensi(3)">
            <span class="material-icons">medical_services</span>
            <div class="menu-label">Sakit Pagi</div>
          </div>
          <div class="menu-item" onclick="navigateToAbsensi(4)">
            <span class="material-icons">menu_book</span>
            <div class="menu-label">Pengajian</div>
          </div>
          <div class="menu-item" onclick="navigateTo('rekap')">
            <span class="material-icons">assessment</span>
            <div class="menu-label">Rekap</div>
          </div>
          <div class="menu-item" onclick="navigateTo('santri')">
            <span class="material-icons">school</span>
            <div class="menu-label">Data Santri</div>
          </div>
          <div class="menu-item" onclick="navigateTo('kamar')">
            <span class="material-icons">bed</span>
            <div class="menu-label">Data Kamar</div>
          </div>
          <div class="menu-item" onclick="navigateTo('pengaturan')">
            <span class="material-icons">settings</span>
            <div class="menu-label">Pengaturan</div>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Navigasi ke halaman absensi dengan jenis yang sudah dipilih
 * Dipanggil saat user mengklik menu absensi di dashboard
 * 
 * @param {number} jenisId - ID jenis absensi (1=malam, 2=berjamaah, 3=sakit, 4=pengajian)
 */
function navigateToAbsensi(jenisId) {
  // Simpan jenis absensi yang dipilih ke sessionStorage
  sessionStorage.setItem('selectedJenisAbsensi', jenisId);
  // Navigasi ke halaman absensi
  navigateTo('absensi');
}

/**
 * Format tanggal ke format Indonesia
 * Contoh: "Senin, 15 Januari 2024"
 * 
 * @param {Date} date - Object tanggal
 * @returns {string} Tanggal dalam format Indonesia
 */
function formatDate(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName}, ${day} ${month} ${year}`;
}
