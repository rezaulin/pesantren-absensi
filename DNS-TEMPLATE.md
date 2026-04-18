# ══════════════════════════════════════════════════════════
# DNS Template - Cloudflare untuk Klien Baru
# ══════════════════════════════════════════════════════════

## Sebelum Deploy

### 1. Tambah Domain ke Cloudflare
- Dashboard Cloudflare → "Add a Site" → masukkan domain klien
- Pilih Free plan
- Cloudflare akan beri 2 nameserver, misalnya:
  - ada.ns.cloudflare.com
  - bila.ns.cloudflare.com

### 2. Ganti Nameserver di Registrar (Namecheap/GoDaddy/dst)
- Login ke tempat beli domain
- Ganti nameserver ke yang dikasih Cloudflare
- Tunggu propagasi (bisa sampe 24 jam, biasanya < 1 jam)

### 3. Set DNS Records (template di bawah)

---

## DNS Records Template

Setelah domain aktif di Cloudflare, tambahkan record berikut:

| Type | Name | Content          | Proxy | TTL  |
|------|------|------------------|-------|------|
| A    | @    | 157.245.200.128  | ✅    | Auto |
| A    | www  | 157.245.200.128  | ✅    | Auto |

Catatan:
- **@** artinya domain utama (misal: absensi.alfalah.sch.id)
- **www** opsional, biar www.absensi.alfalah.sch.id juga jalan
- **Proxy ON** (orange cloud) → dapat SSL gratis + CDN + proteksi DDoS
- IP VPS: 157.245.200.128

---

## SSL Setup (setelah DNS aktif)

### Opsi A: Cloudflare Origin Certificate (Recommended)
1. Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
2. Pilih: RSA 2048, valid 15 tahun
3. Copy certificate & private key
4. Simpan di VPS:
```bash
# Buat folder ssl kalau belum ada
mkdir -p /etc/nginx/ssl

# Simpan cert & key (ganti NAMA dengan nama klien)
cat > /etc/nginx/ssl/absensi-NAMA.crt << 'EOF'
-----BEGIN CERTIFICATE-----
PASTE_CERTIFICATE_DISINI
-----END CERTIFICATE-----
EOF

cat > /etc/nginx/ssl/absensi-NAMA.key << 'EOF'
-----BEGIN PRIVATE KEY-----
PASTE_PRIVATE_KEY_DISINI
-----END PRIVATE KEY-----
EOF

# Reload nginx
nginx -t && systemctl reload nginx
```

### Opsi B: Let's Encrypt (Kalau mau bebas Cloudflare)
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d absensi.alfalah.sch.id
```

---

## Deploy Klien Baru (Full Checklist)

```
□ 1. Beli domain / dapat domain dari klien
□ 2. Tambah domain ke Cloudflare
□ 3. Ganti nameserver di registrar
□ 4. Tunggu DNS aktif (cek: nslookup absensi.xxx.sch.id)
□ 5. Tambah A Record → 157.245.200.128
□ 6. Buat Origin Certificate di Cloudflare
□ 7. Simpan cert & key di VPS
□ 8. Jalankan deploy script:
      bash /root/pesantren-absensi/deploy-client.sh nama-klien 300X absensi.xxx.sch.id
□ 9. Cek: https://absensi.xxx.sch.id
□ 10. Login admin/admin123 → ganti password!
```

---

## Port Allocation (biar gak bentrok)

| Klien              | Port | Domain                       |
|--------------------|------|------------------------------|
| (utama/testing)    | 3000 | absen.reviewtechno.me        |
| klien-1            | 3001 | absensi.xxx1.sch.id          |
| klien-2            | 3002 | absensi.xxx2.sch.id          |
| klien-3            | 3003 | absensi.xxx3.sch.id          |
| dst...             | ...  | ...                          |

---

## Quick Commands

```bash
# Deploy klien baru
bash /root/pesantren-absensi/deploy-client.sh <nama> <port> <domain>

# Cek semua klien yang jalan
pm2 list

# Restart klien tertentu
pm2 restart absensi-<nama>

# Lihat log klien
pm2 logs absensi-<nama> --lines 50

# Backup semua klien
bash /root/pesantren-absensi/backup-all.sh
```
