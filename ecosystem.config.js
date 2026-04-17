// PM2 Ecosystem - Multi-klien di 1 VPS
// Deploy per klien: pm2 start ecosystem.config.js --only klien-nama
//
// Cara pakai:
// 1. Copy project ke /var/www/klien-nama/
// 2. Edit bagian di bawah (ganti nama, port, path)
// 3. Jalankan: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    // ── Klien 1 ──────────────────────────────────────────
    {
      name: 'absensi-pesantren-alfa',
      script: 'server.js',
      cwd: '/var/www/pesantren-alfa',
      env: {
        PORT: 3001,
        JWT_SECRET: 'ganti-dengan-secret-random-klien-1'
      },
      instances: 1,
      max_memory_restart: '200M',
      error_file: '/var/log/pm2/pesantren-alfa-error.log',
      out_file: '/var/log/pm2/pesantren-alfa-out.log',
    },
    // ── Klien 2 ──────────────────────────────────────────
    {
      name: 'absensi-pesantren-beta',
      script: 'server.js',
      cwd: '/var/www/pesantren-beta',
      env: {
        PORT: 3002,
        JWT_SECRET: 'ganti-dengan-secret-random-klien-2'
      },
      instances: 1,
      max_memory_restart: '200M',
      error_file: '/var/log/pm2/pesantren-beta-error.log',
      out_file: '/var/log/pm2/pesantren-beta-out.log',
    },
    // ── Tambah klien baru: copy blok di atas ─────────────
  ]
};
