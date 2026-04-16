/**
 * ============================================
 * API HELPER - KOMUNIKASI DENGAN BACKEND
 * ============================================
 * File ini berisi fungsi-fungsi untuk berkomunikasi dengan backend API.
 * Semua request HTTP menggunakan fetch API.
 * Token JWT otomatis disisipkan ke header Authorization.
 */

// Base URL untuk API - sesuaikan dengan server backend
const API_BASE_URL = window.location.origin + '/api';

/**
 * Fungsi untuk mendapatkan token dari localStorage
 * Token disimpan setelah user berhasil login
 * 
 * @returns {string|null} Token JWT atau null jika belum login
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Fungsi untuk menyimpan token ke localStorage
 * Dipanggil setelah login berhasil
 * 
 * @param {string} token - Token JWT dari server
 */
function setToken(token) {
  localStorage.setItem('token', token);
}

/**
 * Fungsi untuk menghapus token dari localStorage
 * Dipanggil saat logout
 */
function removeToken() {
  localStorage.removeItem('token');
}

/**
 * Fungsi utama untuk request ke API
 * Menangani headers, error handling, dan autentikasi secara otomatis
 * 
 * @param {string} endpoint - Path endpoint (contoh: '/santri')
 * @param {Object} options - Opsi fetch (method, body, dll)
 * @returns {Promise<Object>} Response dari server dalam format JSON
 */
async function apiRequest(endpoint, options = {}) {
  // Siapkan headers default
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Tambahkan token JWT jika ada (untuk endpoint yang memerlukan autentikasi)
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Lakukan request ke backend
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    // Parse response sebagai JSON
    const data = await response.json();

    // Jika response bukan OK (status 4xx atau 5xx), throw error
    if (!response.ok) {
      // Jika 401 (Unauthorized), token mungkin expired - redirect ke login
      if (response.status === 401) {
        removeToken();
        window.location.reload();
      }
      throw new Error(data.message || 'Terjadi kesalahan pada server');
    }

    return data;
  } catch (error) {
    // Log error untuk debugging
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Shortcut untuk GET request
 * 
 * @param {string} endpoint - Path endpoint
 * @returns {Promise<Object>} Response data
 */
function apiGet(endpoint) {
  return apiRequest(endpoint, { method: 'GET' });
}

/**
 * Shortcut untuk POST request
 * 
 * @param {string} endpoint - Path endpoint
 * @param {Object} body - Data yang akan dikirim
 * @returns {Promise<Object>} Response data
 */
function apiPost(endpoint, body) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Shortcut untuk PUT request
 * 
 * @param {string} endpoint - Path endpoint
 * @param {Object} body - Data yang akan diupdate
 * @returns {Promise<Object>} Response data
 */
function apiPut(endpoint, body) {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

/**
 * Shortcut untuk DELETE request
 * 
 * @param {string} endpoint - Path endpoint
 * @returns {Promise<Object>} Response data
 */
function apiDelete(endpoint) {
  return apiRequest(endpoint, { method: 'DELETE' });
}

// ============================================
// API ENDPOINTS - Kumpulan fungsi untuk setiap endpoint
// ============================================

/**
 * API untuk Autentikasi
 */
const AuthAPI = {
  // Login dengan username dan password
  login: (username, password) => apiPost('/auth/login', { username, password }),
  
  // Mendapatkan data user yang sedang login
  getMe: () => apiGet('/auth/me'),
  
  // Registrasi user baru (hanya admin)
  register: (data) => apiPost('/auth/register', data)
};

/**
 * API untuk Data Santri
 */
const SantriAPI = {
  // Mendapatkan semua santri, dengan filter opsional
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiGet(`/santri${params ? '?' + params : ''}`);
  },
  
  // Mendapatkan detail satu santri
  getById: (id) => apiGet(`/santri/${id}`),
  
  // Menambahkan santri baru
  create: (data) => apiPost('/santri', data),
  
  // Mengupdate data santri
  update: (id, data) => apiPut(`/santri/${id}`, data),
  
  // Menghapus santri
  delete: (id) => apiDelete(`/santri/${id}`)
};

/**
 * API untuk Data Kamar
 */
const KamarAPI = {
  // Mendapatkan semua kamar
  getAll: () => apiGet('/kamar'),
  
  // Mendapatkan detail kamar beserta santri di dalamnya
  getById: (id) => apiGet(`/kamar/${id}`),
  
  // Menambahkan kamar baru
  create: (data) => apiPost('/kamar', data),
  
  // Mengupdate data kamar
  update: (id, data) => apiPut(`/kamar/${id}`, data),
  
  // Menghapus kamar
  delete: (id) => apiDelete(`/kamar/${id}`)
};

/**
 * API untuk Absensi
 */
const AbsensiAPI = {
  // Mendapatkan daftar jenis absensi
  getJenis: () => apiGet('/absensi/jenis'),
  
  // Submit absensi batch (banyak santri sekaligus)
  submit: (data) => apiPost('/absensi', data),
  
  // Mendapatkan rekap absensi dengan filter
  getRekap: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiGet(`/absensi/rekap${params ? '?' + params : ''}`);
  },
  
  // Mendapatkan statistik absensi untuk dashboard
  getStatistik: () => apiGet('/absensi/statistik'),
  
  // Mendapatkan absensi per kamar
  getByKamar: (kamarId, filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiGet(`/absensi/kamar/${kamarId}${params ? '?' + params : ''}`);
  }
};
