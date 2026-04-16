/**
 * ============================================
 * AUTH MODULE - AUTENTIKASI FRONTEND
 * ============================================
 * File ini menangani proses login, logout, dan pengecekan
 * status autentikasi di sisi frontend.
 */

// Variabel untuk menyimpan data user yang sedang login
let currentUser = null;

/**
 * Fungsi untuk mengecek apakah user sudah login
 * Mengecek keberadaan token di localStorage
 * 
 * @returns {boolean} true jika sudah login, false jika belum
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Fungsi untuk mendapatkan data user yang sedang login
 * 
 * @returns {Object|null} Data user atau null
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Fungsi untuk melakukan login
 * Mengirim request ke backend dan menyimpan token jika berhasil
 * 
 * @param {string} username - Username user
 * @param {string} password - Password user
 * @returns {Promise<Object>} Data user yang berhasil login
 */
async function login(username, password) {
  try {
    // Kirim request login ke backend
    const response = await AuthAPI.login(username, password);
    
    // Simpan token ke localStorage
    setToken(response.data.token);
    
    // Simpan data user ke variabel
    currentUser = response.data.user;
    
    // Simpan juga ke localStorage untuk persistensi
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    return currentUser;
  } catch (error) {
    // Lempar error agar bisa ditangani oleh caller
    throw error;
  }
}

/**
 * Fungsi untuk melakukan logout
 * Menghapus token dan data user, lalu redirect ke halaman login
 */
function logout() {
  // Hapus token dan data user dari localStorage
  removeToken();
  localStorage.removeItem('user');
  currentUser = null;
  
  // Reload halaman untuk kembali ke login
  window.location.reload();
}

/**
 * Fungsi untuk memuat data user dari server
 * Dipanggil saat aplikasi dimulai untuk memverifikasi token
 * 
 * @returns {Promise<boolean>} true jika token valid, false jika tidak
 */
async function loadCurrentUser() {
  try {
    // Coba ambil data user dari localStorage dulu
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
    }
    
    // Verifikasi token dengan mengambil data user dari server
    if (isLoggedIn()) {
      const response = await AuthAPI.getMe();
      currentUser = response.data;
      localStorage.setItem('user', JSON.stringify(currentUser));
      return true;
    }
    
    return false;
  } catch (error) {
    // Token tidak valid, hapus data
    console.error('Token tidak valid:', error);
    removeToken();
    localStorage.removeItem('user');
    currentUser = null;
    return false;
  }
}

/**
 * Render halaman login
 * Menampilkan form login dengan desain Material Design
 * 
 * @returns {string} HTML untuk halaman login
 */
function renderLoginPage() {
  return `
    <div class="login-page">
      <div class="login-card">
        <!-- Logo aplikasi menggunakan emoji masjid -->
        <div class="login-logo">🕌</div>
        
        <!-- Judul aplikasi -->
        <h1 class="login-title">Sistem Absensi Pesantren</h1>
        <p class="login-subtitle">Silakan login untuk melanjutkan</p>
        
        <!-- Alert untuk pesan error -->
        <div id="loginError" class="alert alert-error hidden">
          <span class="material-icons">error</span>
          <span id="loginErrorMessage">Username atau password salah</span>
        </div>
        
        <!-- Form login -->
        <form id="loginForm" onsubmit="handleLogin(event)">
          <!-- Input username -->
          <div class="form-group">
            <label class="form-label" for="username">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username"
              class="form-input" 
              placeholder="Masukkan username"
              required
              autocomplete="username"
            >
          </div>
          
          <!-- Input password -->
          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              class="form-input" 
              placeholder="Masukkan password"
              required
              autocomplete="current-password"
            >
          </div>
          
          <!-- Tombol login -->
          <button type="submit" class="btn btn-primary btn-full" id="loginBtn">
            <span class="material-icons">login</span>
            Login
          </button>
        </form>
        
        <!-- Info login default -->
        <div class="mt-3" style="font-size: 12px; color: #757575;">
          <p>Admin: admin / admin123</p>
          <p>Pengurus: ahmad / pengurus123</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Handler untuk submit form login
 * Dipanggil ketika user mengklik tombol Login
 * 
 * @param {Event} event - Event dari form submit
 */
async function handleLogin(event) {
  // Mencegah form melakukan reload halaman
  event.preventDefault();
  
  // Ambil elemen-elemen yang dibutuhkan
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const loginErrorMessage = document.getElementById('loginErrorMessage');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  // Sembunyikan pesan error sebelumnya
  loginError.classList.add('hidden');
  
  // Nonaktifkan tombol dan ubah teks saat loading
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Loading...';
  
  try {
    // Panggil fungsi login
    await login(usernameInput.value, passwordInput.value);
    
    // Jika berhasil, tampilkan halaman utama
    renderApp();
    
  } catch (error) {
    // Jika gagal, tampilkan pesan error
    loginError.classList.remove('hidden');
    loginErrorMessage.textContent = error.message || 'Login gagal. Silakan coba lagi.';
    
    // Kembalikan tombol ke state normal
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span class="material-icons">login</span> Login';
  }
}
