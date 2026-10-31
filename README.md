# Sistem Nilai — Arsitektur Zero Trust Security (NIST SP 800-207)

> **Tugas Praktikum Individu**  
> Mata Kuliah: Keamanan Informasi (KP70065004)  
> Program Studi Informatika, Universitas Siliwangi  

---

## 1. Ringkasan Arsitektur & Konsep

Proyek ini mengimplementasikan backend **Sistem Nilai dan Transkrip Mahasiswa** yang menerapkan arsitektur **Zero Trust Security** berbasis panduan **NIST SP 800-207**.

### Tiga Komponen Utama Sistem:

| Komponen | Port | Peran NIST SP 800-207 | Deskripsi |
|---|---|---|---|
| **API Gateway** | `3000` | **Policy Enforcement Point (PEP)** & **Policy Engine (PE)** | Satu-satunya gerbang masuk seluruh request klien. Bertugas mengautentikasi user, mengevaluasi kebijakan keamanan context-aware (role, jam akses, ownership, device), mencatat audit log, dan mem-proxy request yang diizinkan. |
| **Service Nilai** | `3001` | **Resource / Policy-Compliant Service** | Mengelola nilai mata kuliah dan finalisasi kelas. Menolak akses langsung tanpa gateway secret, dan melakukan verifikasi ulang token JWT. |
| **Service Transkrip**| `3002` | **Resource / Policy-Compliant Service** | Mengelola data transkrip akademik. Menerima sinkronisasi nilai secara eksklusif dari token service melalui Gateway. |
| **Database** | Shared | **Single Source of Truth** | SQLite (`database/database.sqlite`) dengan foreign keys dan WAL mode untuk konkurensi. |

---

## 2. Penerapan Tiga Prinsip Zero Trust

### 1. Never Trust, Always Verify
- **Otentikasi Berlapis**: Setiap request ke API Gateway wajib menyertakan **JWT Bearer Token** (masa berlaku 10 menit untuk user, 5 menit untuk service).
- **Verifikasi Konteks Perangkat**: Header `X-Device-ID` wajib ada dan harus terdaftar di tabel `devices` untuk pengguna yang bersangkutan.
- **Verifikasi Ganda di Sisi Layanan**: Backend Service (:3001 dan :3002) **tidak pernah percaya begitu saja** kepada traffic masuk; service memverifikasi ulang:
  1. Header `X-Gateway-Secret` (mencegah bypass gateway).
  2. Tanda tangan digital JWT.
  3. Masa berlaku (expiration) token JWT.

### 2. Least Privilege (Hak Akses Minimum)
- **Role-Based Access Control (RBAC)**:
  - `mahasiswa`: Hanya dapat melihat nilai dan transkrip miliknya sendiri. Dilarang melihat data mahasiswa lain atau memodifikasi nilai.
  - `dosen`: Hanya dapat melihat dan mengubah nilai pada **kelas yang diampunya**. Dilarang mengubah nilai kelas dosen lain dan dilarang melihat transkrip mahasiswa.
  - `admin`: Dapat melihat transkrip seluruh mahasiswa dan melihat seluruh audit log, namun tidak memodifikasi nilai akademik.
- **Attribute-Based Access Control (ABAC)**:
  - **Kepemilikan Kelas**: Dosen hanya berhak melakukan finalisasi atau edit nilai pada kelas miliknya (`k.dosen_id === user.id`).
  - **Konteks Jam Akses**: Pengubahan nilai (`PUT /nilai/:id`) dan finalisasi kelas (`POST /kelas/:id/finalisasi`) hanya diizinkan pada jam operasional (`07.00 - 21.00`).
  - **Status Finalisasi**: Data nilai yang sudah difinalisasi (`is_final = 1`) dikunci secara permanen dan tidak dapat diedit kembali.

### 3. Assume Breach (Asumsikan Terjadi Pembobolan)
- **Pencegahan Bypass (Defense in Depth)**: Service Nilai dan Transkrip menolak koneksi langsung dari klien luar yang mencoba membypass Gateway (`403 Forbidden`).
- **Pencabutan Token (Revocation)**: Refresh token disimpan di database dengan flag `revoked`. Saat logout, refresh token langsung dicabut sehingga tidak dapat digunakan kembali.
- **Isolasi Antar-Layanan**: Service Nilai tidak memanggil Service Transkrip secara langsung. Service Nilai wajib meminta **Token Service** khusus dari Gateway (`POST /auth/service`) lalu mengirim data melalui Gateway (`POST /transkrip/sinkron`). Token user biasa ditolak keras pada endpoint ini.
- **Audit Logging Komprehensif**: Gateway mencatat setiap keputusan (**ALLOW** maupun **DENY**) ke tabel `audit_logs` secara transparan (mencakup waktu, subjek, peran, endpoint, device, IP, dan alasan keputusan).

---

## 3. Data Akun & Perangkat Seed (Praktikum)

Semua akun dan perangkat telah di-seed otomatis ke dalam database:

| Username | Role | Password | NIM / Identitas | Registered Device ID | Keterangan |
|---|---|---|---|---|---|
| `admin1` | `admin` | `admin123` | - | `DEV-ADMIN-001` | Administrator Sistem |
| `dosen_eko` | `dosen` | `dosen123` | Pengampu IF301 | `DEV-DOSEN-EKO-001` | Dosen (Keamanan Informasi) |
| `dosen_budi` | `dosen` | `dosen123` | Pengampu IF302 | `DEV-DOSEN-BUDI-001` | Dosen (Kriptografi) |
| `mhs_andi` | `mahasiswa` | `mhs123` | `220101001` | `DEV-MHS-ANDI-001` | Mahasiswa 1 |
| `mhs_siti` | `mahasiswa` | `mhs123` | `220101002` | `DEV-MHS-SITI-001` | Mahasiswa 2 |
| `mhs_reza` | `mahasiswa` | `mhs123` | `220101003` | `DEV-MHS-REZA-001` | Mahasiswa 3 |

**Kredensial Service-to-Service:**
- Client ID: `service-nilai`
- Client Secret: `secret-service-nilai-2026`

---

## 4. Panduan Menjalankan Sistem

### Persyaratan Sistem
- Node.js versi 18+ (direkomendasikan v20 atau v24)
- npm

### 1. Inisialisasi Database (Seeding)
```bash
npm run seed
```

### 2. Menjalankan Ketiga Layanan Sekaligus
Cukup jalankan satu perintah berikut:
```bash
npm run start:all
```
Perintah ini akan menjalankan secara bersamaan:
- `API Gateway` di `http://localhost:3000`
- `Service Nilai` di `http://localhost:3001`
- `Service Transkrip` di `http://localhost:3002`

*(Atau Anda dapat menjalankannya di 3 terminal terpisah: `npm run start:gateway`, `npm run start:nilai`, dan `npm run start:transkrip`)*.

---

## 5. Pengujian Sistem

### A. Pengujian Otomatis (33 Skenario Zero Trust)
Kami telah menyediakan test suite otomatis menyeluruh yang menguji skenario T01 hingga T33:
```bash
npm run test:all
```
Script ini akan:
1. Memeriksa ketersediaan ketiga service (dan menjalankannya otomatis jika belum aktif).
2. Melakukan seed database ke kondisi awal.
3. Menjalankan seluruh pengujian autentikasi, otorisasi, bypass prevention, context verification, dan audit logging.
4. Menampilkan laporan kelulusan 100%.

### B. Pengujian Menggunakan Postman
Import file koleksi yang sudah siap pakai:
- Lokasi file: `postman/zero_trust_sistem_nilai.postman_collection.json`
- Buka Postman -> **Import** -> Pilih file di atas.
- Koleksi sudah dilengkapi variabel otomatis dan test script di setiap request.

---

## 6. Daftar Endpoint API

### 1. API Gateway Auth (:3000)
- `POST /auth/login` : Login user (wajib `X-Device-ID`, username, password). Return access token (10m) & refresh token (1d).
- `POST /auth/refresh` : Refresh token untuk menerbitkan access token baru.
- `POST /auth/logout` : Logout dan mencabut (`revoke = 1`) refresh token.
- `POST /auth/service` : Kredensial client_id + client_secret untuk menerbitkan token service (5m).
- `GET /audit-logs` : Melihat seluruh riwayat audit log (khusus role `admin`).

### 2. Service Nilai (:3001 via Gateway :3000)
- `GET /nilai` : Melihat nilai (Mahasiswa: nilai sendiri; Dosen: kelas ampuannya).
- `PUT /nilai/:id` : Mengubah nilai (Dosen pengampu, dalam jam operasional 07.00-21.00, sebelum finalisasi).
- `POST /kelas/:id/finalisasi` : Memfinalisasi nilai kelas -> memicu Service Nilai meminta token service dan mengirim sinkronisasi ke Service Transkrip melalui Gateway.

### 3. Service Transkrip (:3002 via Gateway :3000)
- `GET /transkrip/:nim` : Melihat transkrip mahasiswa (Mahasiswa: NIM sendiri; Admin: semua NIM).
- `POST /transkrip/sinkron` : Sinkronisasi data transkrip (Eksklusif token role `service`).

---

## 7. Panduan Video Demonstrasi (Durasi 6–9 Menit)

Gunakan alur berikut untuk merekam video demonstrasi yang runut dan mencakup seluruh indikator penilaian dosen:

### Menit 00:00 – 01:00: Pembukaan & Pengenalan Arsitektur
1. Salam pembuka, sebutkan Nama, NIM, dan judul praktikum Zero Trust Security.
2. Tunjukkan struktur proyek di VS Code/editor:
   - Direktori `gateway/` (PEP & Policy Engine) di port 3000.
   - Direktori `service-nilai/` di port 3001.
   - Direktori `service-transkrip/` di port 3002.
   - Direktori `database/` (file database SQLite bersama).
3. Jalankan `npm run start:all` di terminal untuk menunjukkan ketiga service aktif.

### Menit 01:00 – 02:30: Autentikasi, Token, & Perangkat (Never Trust, Always Verify)
1. **Login Mahasiswa Berhasil**: Buka Postman, kirim request `POST /auth/login` untuk `mhs_andi` dengan header `X-Device-ID: DEV-MHS-ANDI-001`. Tunjukkan kembalinya `access_token` (berlaku 10 menit) dan `refresh_token` (berlaku 1 hari).
2. **Uji Perangkat Tidak Terdaftar**: Ubah `X-Device-ID` menjadi `DEV-UNKNOWN-HACKER` -> Tunjukkan respon **403 Forbidden** (Zero Trust menolak perangkat asing).
3. **Uji Refresh Token & Logout**:
   - Kirim `POST /auth/refresh` -> dapatkan access token baru.
   - Kirim `POST /auth/logout` -> token dicabut.
   - Ulangi kirim `POST /auth/refresh` -> Tunjukkan respon **401 Unauthorized** (token yang dicabut tidak bisa dipakai lagi - *Assume Breach*).

### Menit 02:30 – 04:30: Hak Akses Nilai & Konteks Dinamis (Least Privilege)
1. **Mahasiswa Lihat Nilai**: Kirim `GET /nilai` menggunakan token Andi -> Tunjukkan hanya nilai milik Andi yang tampil.
2. **Dosen Lihat Nilai**: Kirim `GET /nilai` menggunakan token Dosen Eko -> Tunjukkan hanya kelas ampuannya (IF301) yang muncul.
3. **Dosen Ubah Nilai**:
   - Dosen Eko mengubah nilai di kelas IF301 pada jam akses (kirim `X-Mock-Hour: 10`) -> Berhasil (200 OK).
   - Simulasikan di luar jam akses (kirim `X-Mock-Hour: 23`) -> Tunjukkan respon **403 Forbidden** (*"Akses ditolak di luar jam operasional"*).
   - Dosen Budi coba ubah nilai di kelas Eko -> Tunjukkan respon **403 Forbidden** (*"Dosen bukan pengampu kelas"*).
   - Mahasiswa coba ubah nilai -> Tunjukkan respon **403 Forbidden** (*"Role mahasiswa tidak memiliki hak akses"*).

### Menit 04:30 – 06:00: Finalisasi & Komunikasi Antar-Layanan
1. **Finalisasi Kelas**: Dosen Eko memfinalisasi kelas IF301 (`POST /kelas/1/finalisasi`).
2. Jelaskan alur Zero Trust yang terjadi di background:
   - Service Nilai meminta token khusus `service` ke Gateway (`POST /auth/service`).
   - Service Nilai meneruskan data nilai ke Gateway (`POST /transkrip/sinkron`) menggunakan token service.
   - Gateway mengevaluasi role token service dan mem-proxy ke Service Transkrip (:3002).
3. **Cek Transkrip**: Buka `GET /transkrip/220101001` -> Tunjukkan nilai yang baru difinalisasi sudah tersinkronisasi.
4. **Kunci Nilai Final**: Coba ubah nilai yang sudah final -> Tunjukkan respon **403 Forbidden** (*"Nilai sudah difinalisasi dan tidak dapat diubah"*).

### Menit 06:00 – 07:30: Hak Akses Transkrip & Pencegahan Bypass (Assume Breach)
1. **Least Privilege Transkrip**:
   - Mahasiswa Andi buka transkrip NIM miliknya -> Berhasil (200 OK).
   - Mahasiswa Andi coba buka transkrip NIM Siti (220101002) -> **403 Forbidden**.
   - Admin buka transkrip Siti -> Berhasil (200 OK).
   - Dosen coba buka transkrip -> **403 Forbidden**.
2. **Pencegahan Bypass (Defense in Depth)**:
   - Coba tembak langsung ke Service Nilai tanpa gateway (`GET http://localhost:3001/nilai`) -> Tunjukkan respon **403 Forbidden** (*"Semua request wajib melewati API Gateway"*).
   - Tunjukkan kode middleware `verifyGateway.js` yang memeriksa `X-Gateway-Secret` dan memvalidasi ulang JWT.

### Menit 07:30 – 08:30: Audit Log & Kesimpulan
1. **Audit Logging**: Kirim `GET /audit-logs` menggunakan token Admin -> Tunjukkan rekaman log yang mencakup:
   - Timestamp waktu akses
   - Subjek dan Role
   - Endpoint dan Method HTTP
   - Device ID yang digunakan
   - Hasil keputusan (**ALLOW** atau **DENY**)
   - Alasan spesifik penolakan
2. **Jalankan Test Suite**: Tunjukkan di terminal `npm run test:all` yang lulus 33/33 tes sebagai penutup yang meyakinkan.
3. Penutup video.
