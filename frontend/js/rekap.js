/**
 * ============================================
 * REKAP.JS - HALAMAN REKAP ABSENSI
 * ============================================
 * File ini menangani tampilan rekap/summary absensi
 * User bisa filter berdasarkan bulan, jenis absensi, dan kamar
 * Hasil ditampilkan dalam bentuk tabel
 */

/**
 * Render halaman rekap absensi
 * Menampilkan filter dan tabel rekap
 * 
 * @param {HTMLElement} container - Element DOM untuk me-render konten
 */
async function renderRekapPage(container) {
  try {
    // Tampilkan loading state
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
          <span class="material-icons">arrow_back</span>
        </button>
        <h1>Rekap Absensi</h1>
      </div>
      <div class="loading-spinner" style="margin: 50px auto;"></div>
    `;

    // Ambil data jenis absensi untuk dropdown filter
    const jenisResponse = await AbsensiAPI.getJenis();
    const jenisList = jenisResponse.data || [];

    // Ambil data kamar untuk dropdown filter
    const kamarResponse = await KamarAPI.getAll();
    const kamarList = kamarResponse.data || [];

    // Dapatkan bulan saat ini (format: YYYY-MM)
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Render halaman rekap dengan filter dan area tabel
    container.innerHTML = `
      <div class="rekap-page">
        <!-- Header halaman -->
        <div class="page-header">
          <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
            <span class="material-icons">arrow_back</span>
          </button>
          <h1>Rekap Absensi</h1>
        </div>

        <!-- Filter Section -->
        <div class="card">
          <div class="card-header">Filter Rekap</div>
          <div class="card-body">
            <!-- Filter Bulan -->
            <div class="form-group">
              <label class="form-label">Bulan</label>
              <input 
                type="month" 
                class="form-input" 
                id="filterBulan" 
                value="${currentMonth}"
              >
            </div>

            <!-- Filter Jenis Absensi -->
            <div class="form-group">
              <label class="form-label">Jenis Absensi</label>
              <select class="form-select" id="filterJenis">
                <option value="">Semua Jenis</option>
                ${jenisList.map(jenis => `
                  <option value="${jenis.id}">${jenis.nama}</option>
                `).join('')}
              </select>
            </div>

            <!-- Filter Kamar -->
            <div class="form-group">
              <label class="form-label">Kamar</label>
              <select class="form-select" id="filterKamar">
                <option value="">Semua Kamar</option>
                ${kamarList.map(kamar => `
                  <option value="${kamar.id}">${kamar.nama_asrama} - ${kamar.nomor_kamar}</option>
                `).join('')}
              </select>
            </div>

            <!-- Tombol Filter -->
            <button class="btn btn-primary btn-full" onclick="loadRekapData()">
              <span class="material-icons">search</span>
              Tampilkan Rekap
            </button>
          </div>
        </div>

        <!-- Area Hasil Rekap -->
        <div class="card">
          <div class="card-header">Hasil Rekap</div>
          <div class="card-body" id="rekapResult">
            <p style="text-align: center; color: var(--text-secondary);">
              Pilih filter dan klik "Tampilkan Rekap" untuk melihat data
            </p>
          </div>
        </div>

        <!-- Statistik Rekap -->
        <div class="card" id="rekapStatistik" style="display: none;">
          <div class="card-header">Statistik</div>
          <div class="card-body" id="statistikContent">
            <!-- Statistik akan dimuat di sini -->
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading rekap page:', error);
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
          <span class="material-icons">arrow_back</span>
        </button>
        <h1>Rekap Absensi</h1>
      </div>
      <div class="alert alert-error">Gagal memuat halaman: ${error.message}</div>
    `;
  }
}

/**
 * Load data rekap berdasarkan filter yang dipilih
 * Mengambil data dari API dan menampilkan dalam tabel
 */
async function loadRekapData() {
  const rekapResult = document.getElementById('rekapResult');
  const rekapStatistik = document.getElementById('rekapStatistik');
  const statistikContent = document.getElementById('statistikContent');

  // Ambil nilai filter
  const bulan = document.getElementById('filterBulan').value;
  const jenis = document.getElementById('filterJenis').value;
  const kamarId = document.getElementById('filterKamar').value;

  // Validasi minimal bulan harus dipilih
  if (!bulan) {
    alert('Pilih bulan terlebih dahulu!');
    return;
  }

  // Tampilkan loading
  rekapResult.innerHTML = '<div class="loading-spinner" style="margin: 20px auto;"></div>';

  try {
    // Siapkan parameter filter
    const filters = { bulan };
    if (jenis) filters.jenis = jenis;
    if (kamarId) filters.kamar_id = kamarId;

    // Ambil data rekap dari API
    const response = await AbsensiAPI.getRekap(filters);
    const rekapData = response.data || [];

    // Hitung statistik
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlfa = 0;

    rekapData.forEach(item => {
      switch (item.status) {
        case 'HADIR': totalHadir++; break;
        case 'SAKIT': totalSakit++; break;
        case 'IZIN': totalIzin++; break;
        case 'ALFA': totalAlfa++; break;
      }
    });

    // Render tabel rekap
    if (rekapData.length === 0) {
      rekapResult.innerHTML = `
        <p style="text-align: center; color: var(--text-secondary);">
          Tidak ada data absensi untuk filter yang dipilih
        </p>
      `;
      rekapStatistik.style.display = 'none';
    } else {
      // Render tabel dengan data
      rekapResult.innerHTML = `
        <div style="overflow-x: auto;">
          <table class="rekap-table">
            <thead>
              <tr>
                <th>No</th>
                <th>NIS</th>
                <th>Nama</th>
                <th>Kamar</th>
                <th>Jenis</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${rekapData.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.nis}</td>
                  <td>${item.nama_santri}</td>
                  <td>${item.nomor_kamar || '-'}</td>
                  <td>${item.jenis_absensi}</td>
                  <td>${formatDateRekap(item.tanggal)}</td>
                  <td>
                    <span class="status-badge ${item.status.toLowerCase()}">${item.status}</span>
                  </td>
                  <td>${item.catatan || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p style="margin-top: 16px; text-align: center; color: var(--text-secondary);">
          Total: ${rekapData.length} catatan absensi
        </p>
      `;

      // Tampilkan statistik
      rekapStatistik.style.display = 'block';
      statistikContent.innerHTML = `
        <div class="stat-cards" style="grid-template-columns: repeat(4, 1fr);">
          <div class="stat-card" style="border-left: 4px solid var(--status-hadir);">
            <div class="stat-value" style="color: var(--status-hadir);">${totalHadir}</div>
            <div class="stat-label">Hadir</div>
          </div>
          <div class="stat-card" style="border-left: 4px solid var(--status-sakit);">
            <div class="stat-value" style="color: var(--status-sakit);">${totalSakit}</div>
            <div class="stat-label">Sakit</div>
          </div>
          <div class="stat-card" style="border-left: 4px solid var(--status-izin);">
            <div class="stat-value" style="color: var(--status-izin);">${totalIzin}</div>
            <div class="stat-label">Izin</div>
          </div>
          <div class="stat-card" style="border-left: 4px solid var(--status-alfa);">
            <div class="stat-value" style="color: var(--status-alfa);">${totalAlfa}</div>
            <div class="stat-label">Alfa</div>
          </div>
        </div>
      `;
    }

  } catch (error) {
    console.error('Error loading rekap:', error);
    rekapResult.innerHTML = `
      <div class="alert alert-error">Gagal memuat data rekap: ${error.message}</div>
    `;
    rekapStatistik.style.display = 'none';
  }
}

/**
 * Format tanggal untuk tampilan rekap
 * Mengubah format ISO date menjadi format Indonesia
 * 
 * @param {string} dateString - Tanggal dalam format ISO (YYYY-MM-DD)
 * @returns {string} Tanggal dalam format DD/MM/YYYY
 */
function formatDateRekap(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}
