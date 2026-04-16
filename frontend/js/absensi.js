/**
 * ============================================
 * ABSENSI.JS - HALAMAN FORM ABSENSI
 * ============================================
 * File ini menangani proses absensi santri
 * Alur: Pilih jenis absen → Pilih kamar → Tampilkan santri → Pilih status → Simpan
 * Mendukung absensi batch (banyak santri sekaligus)
 */

// State untuk menyimpan data absensi yang sedang diproses
let selectedJenisAbsensi = null;
let selectedKamar = null;
let absensiData = {};

/**
 * Render halaman absensi
 * Menampilkan form untuk melakukan absensi santri
 * 
 * @param {HTMLElement} container - Element DOM untuk me-render konten
 */
async function renderAbsensiPage(container) {
  try {
    // Ambil jenis absensi yang dipilih dari sessionStorage (jika ada)
    const savedJenisId = sessionStorage.getItem('selectedJenisAbsensi');
    
    // Ambil data jenis absensi dari API
    const jenisResponse = await AbsensiAPI.getJenis();
    const jenisList = jenisResponse.data || [];

    // Ambil data kamar dari API
    const kamarResponse = await KamarAPI.getAll();
    const kamarList = kamarResponse.data || [];

    // Set jenis absensi yang dipilih (jika ada dari dashboard)
    if (savedJenisId) {
      selectedJenisAbsensi = parseInt(savedJenisId);
      sessionStorage.removeItem('selectedJenisAbsensi');
    }

    // Render halaman absensi
    container.innerHTML = `
      <div class="absensi-page">
        <!-- Header halaman -->
        <div class="page-header">
          <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
            <span class="material-icons">arrow_back</span>
          </button>
          <h1>Absensi Santri</h1>
        </div>

        <!-- Step 1: Pilih Jenis Absensi -->
        <div class="card">
          <div class="card-header">1. Pilih Jenis Absensi</div>
          <div class="card-body">
            <select class="form-select" id="jenisAbsensiSelect" onchange="onJenisAbsensiChange(this.value)">
              <option value="">-- Pilih Jenis Absensi --</option>
              ${jenisList.map(jenis => `
                <option value="${jenis.id}" ${selectedJenisAbsensi === jenis.id ? 'selected' : ''}>
                  ${jenis.nama}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Step 2: Pilih Kamar -->
        <div class="card" id="kamarSection" style="display: ${selectedJenisAbsensi ? 'block' : 'none'}">
          <div class="card-header">2. Pilih Kamar</div>
          <div class="card-body">
            <div class="kamar-list" id="kamarList">
              ${kamarList.map(kamar => `
                <div class="kamar-card" onclick="selectKamar(${kamar.id}, '${kamar.nomor_kamar}', '${kamar.nama_asrama}')">
                  <div class="kamar-header">
                    <h3>${kamar.nama_asrama} - Kamar ${kamar.nomor_kamar}</h3>
                    <span class="badge">${kamar.jumlah_santri} santri</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Step 3: Daftar Santri untuk Absensi -->
        <div id="santriAbsensiSection" style="display: none">
          <div class="card">
            <div class="card-header" id="santriHeader">3. Daftar Santri</div>
            <div class="card-body" id="santriList">
              <!-- Daftar santri akan dimuat di sini -->
            </div>
          </div>

          <!-- Tombol Simpan -->
          <div style="position: fixed; bottom: 0; left: 0; right: 0; padding: 16px; background: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); z-index: 100;">
            <button class="btn btn-primary btn-full" onclick="simpanAbsensi()" id="simpanBtn">
              <span class="material-icons">save</span>
              Simpan Absensi
            </button>
          </div>
        </div>
      </div>
    `;

    // Jika jenis absensi sudah dipilih, langsung tampilkan section kamar
    if (selectedJenisAbsensi) {
      document.getElementById('kamarSection').style.display = 'block';
    }

  } catch (error) {
    console.error('Error loading absensi page:', error);
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-secondary btn-icon" onclick="navigateTo('dashboard')">
          <span class="material-icons">arrow_back</span>
        </button>
        <h1>Absensi Santri</h1>
      </div>
      <div class="alert alert-error">Gagal memuat data: ${error.message}</div>
    `;
  }
}

/**
 * Handler saat jenis absensi dipilih
 * Menampilkan section pemilihan kamar
 * 
 * @param {string} value - ID jenis absensi yang dipilih
 */
function onJenisAbsensiChange(value) {
  selectedJenisAbsensi = value ? parseInt(value) : null;
  
  // Tampilkan/sembunyikan section kamar
  const kamarSection = document.getElementById('kamarSection');
  if (kamarSection) {
    kamarSection.style.display = value ? 'block' : 'none';
  }

  // Reset pilihan kamar dan sembunyikan section santri
  selectedKamar = null;
  const santriSection = document.getElementById('santriAbsensiSection');
  if (santriSection) {
    santriSection.style.display = 'none';
  }
}

/**
 * Handler saat kamar dipilih
 * Memuat daftar santri di kamar tersebut untuk diabsen
 * 
 * @param {number} kamarId - ID kamar yang dipilih
 * @param {string} nomorKamar - Nomor kamar
 * @param {string} namaAsrama - Nama asrama
 */
async function selectKamar(kamarId, nomorKamar, namaAsrama) {
  try {
    selectedKamar = kamarId;
    absensiData = {};

    // Tampilkan loading
    const santriList = document.getElementById('santriList');
    santriList.innerHTML = '<div class="loading-spinner" style="margin: 20px auto;"></div>';

    // Tampilkan section santri
    document.getElementById('santriAbsensiSection').style.display = 'block';
    document.getElementById('santriHeader').textContent = `3. Santri di ${namaAsrama} - Kamar ${nomorKamar}`;

    // Ambil data santri di kamar ini dari API
    const response = await AbsensiAPI.getByKamar(kamarId, {
      jenis_absensi_id: selectedJenisAbsensi,
      tanggal: new Date().toISOString().split('T')[0]
    });

    const santriList2 = response.data?.santri || [];

    // Render daftar santri dengan pilihan status
    santriList.innerHTML = santriList2.length === 0
      ? '<p style="text-align: center; color: var(--text-secondary);">Tidak ada santri di kamar ini</p>'
      : santriList2.map(santri => {
          // Set status default dari data yang sudah ada atau HADIR
          const currentStatus = santri.status_absen && santri.status_absen !== '-' 
            ? santri.status_absen 
            : 'HADIR';
          
          absensiData[santri.santri_id] = {
            status: currentStatus,
            catatan: santri.catatan || ''
          };

          return `
            <div class="santri-item">
              <div class="santri-info">
                <div class="nama">${santri.nama}</div>
                <div class="nis">NIS: ${santri.nis}</div>
              </div>
              <div class="status-buttons">
                <button 
                  class="status-btn ${currentStatus === 'HADIR' ? 'active hadir' : ''}" 
                  data-santri="${santri.santri_id}" 
                  data-status="HADIR"
                  onclick="setSantriStatus(${santri.santri_id}, 'HADIR')"
                >H</button>
                <button 
                  class="status-btn ${currentStatus === 'SAKIT' ? 'active sakit' : ''}" 
                  data-santri="${santri.santri_id}" 
                  data-status="SAKIT"
                  onclick="setSantriStatus(${santri.santri_id}, 'SAKIT')"
                >S</button>
                <button 
                  class="status-btn ${currentStatus === 'IZIN' ? 'active izin' : ''}" 
                  data-santri="${santri.santri_id}" 
                  data-status="IZIN"
                  onclick="setSantriStatus(${santri.santri_id}, 'IZIN')"
                >I</button>
                <button 
                  class="status-btn ${currentStatus === 'ALFA' ? 'active alfa' : ''}" 
                  data-santri="${santri.santri_id}" 
                  data-status="ALFA"
                  onclick="setSantriStatus(${santri.santri_id}, 'ALFA')"
                >A</button>
              </div>
            </div>
          `;
        }).join('');

  } catch (error) {
    console.error('Error loading santri:', error);
    document.getElementById('santriList').innerHTML = `
      <div class="alert alert-error">Gagal memuat data santri: ${error.message}</div>
    `;
  }
}

/**
 * Set status absensi untuk santri tertentu
 * Dipanggil saat user mengklik tombol status (H/S/I/A)
 * 
 * @param {number} santriId - ID santri
 * @param {string} status - Status yang dipilih (HADIR/SAKIT/IZIN/ALFA)
 */
function setSantriStatus(santriId, status) {
  // Update state
  absensiData[santriId] = {
    ...absensiData[santriId],
    status: status
  };

  // Update tampilan tombol
  const buttons = document.querySelectorAll(`button[data-santri="${santriId}"]`);
  buttons.forEach(btn => {
    btn.classList.remove('active', 'hadir', 'sakit', 'izin', 'alfa');
    if (btn.dataset.status === status) {
      btn.classList.add('active', status.toLowerCase());
    }
  });
}

/**
 * Simpan data absensi ke database
 * Mengirim data batch ke API
 */
async function simpanAbsensi() {
  // Validasi
  if (!selectedJenisAbsensi) {
    alert('Pilih jenis absensi terlebih dahulu!');
    return;
  }

  if (!selectedKamar) {
    alert('Pilih kamar terlebih dahulu!');
    return;
  }

  if (Object.keys(absensiData).length === 0) {
    alert('Tidak ada data santri untuk diabsen!');
    return;
  }

  // Konfirmasi
  const confirmSave = confirm('Simpan absensi? Pastikan data sudah benar.');
  if (!confirmSave) return;

  // Siapkan data untuk dikirim ke API
  const simpanBtn = document.getElementById('simpanBtn');
  simpanBtn.disabled = true;
  simpanBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Menyimpan...';

  try {
    // Format data untuk API
    const data = Object.entries(absensiData).map(([santriId, info]) => ({
      santri_id: parseInt(santriId),
      status: info.status,
      catatan: info.catatan || null
    }));

    // Kirim ke API
    const response = await AbsensiAPI.submit({
      jenis_absensi_id: selectedJenisAbsensi,
      tanggal: new Date().toISOString().split('T')[0],
      data: data
    });

    // Tampilkan pesan berhasil
    alert(`Berhasil menyimpan absensi untuk ${data.length} santri!`);

    // Reset state dan kembali ke dashboard
    selectedJenisAbsensi = null;
    selectedKamar = null;
    absensiData = {};
    navigateTo('dashboard');

  } catch (error) {
    console.error('Error saving absensi:', error);
    alert(`Gagal menyimpan absensi: ${error.message}`);
    
    // Kembalikan tombol ke state normal
    simpanBtn.disabled = false;
    simpanBtn.innerHTML = '<span class="material-icons">save</span> Simpan Absensi';
  }
}
