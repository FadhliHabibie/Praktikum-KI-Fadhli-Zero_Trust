const { spawn } = require('child_process');
const path = require('path');
const db = require('../database/db');
const seed = require('../database/seed');

// URLs
const GATEWAY_URL = 'http://localhost:3000';
const NILAI_URL = 'http://localhost:3001';
const TRANSKRIP_URL = 'http://localhost:3002';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let spawnedProcesses = [];

function assert(condition, message, debugData) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
    if (debugData) {
      console.error('     [DEBUG]:', JSON.stringify(debugData));
    }
  }
}

async function isServerUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureServersRunning() {
  const gatewayUp = await isServerUp(`${GATEWAY_URL}/health`);
  const nilaiUp = await isServerUp(`${NILAI_URL}/health`);
  const transkripUp = await isServerUp(`${TRANSKRIP_URL}/health`);

  if (gatewayUp && nilaiUp && transkripUp) {
    console.log('⚡ Ketiga service sudah aktif dan siap diuji.');
    return;
  }

  console.log('🚀 Memulai ketiga service di background untuk pengujian...');

  const services = [
    { name: 'Gateway', file: 'gateway/server.js' },
    { name: 'Service Nilai', file: 'service-nilai/server.js' },
    { name: 'Service Transkrip', file: 'service-transkrip/server.js' }
  ];

  for (const s of services) {
    const p = spawn('node', [path.resolve(__dirname, '..', s.file)], {
      stdio: 'ignore'
    });
    spawnedProcesses.push(p);
  }

  // Tunggu hingga seluruh service siap
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const g = await isServerUp(`${GATEWAY_URL}/health`);
    const n = await isServerUp(`${NILAI_URL}/health`);
    const t = await isServerUp(`${TRANSKRIP_URL}/health`);
    if (g && n && t) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    throw new Error('Gagal memulai service dalam batas waktu timeout');
  }

  console.log('⚡ Seluruh service berhasil berjalan!\n');
}

async function request(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }
  return { status: res.status, headers: res.headers, body };
}

async function runAllTests() {
  console.log('=============================================================');
  console.log(' 🧪 MENJALANKAN TEST SUITE ZERO TRUST SECURITY (T01 - T32)  ');
  console.log('=============================================================\n');

  await ensureServersRunning();

  // Reset database ke kondisi awal
  seed();

  // Ambil ID dinamis dari database setelah seeding
  const userAndi = db.prepare("SELECT id FROM users WHERE username = 'mhs_andi'").get();
  const userSiti = db.prepare("SELECT id FROM users WHERE username = 'mhs_siti'").get();
  const kelasEko = db.prepare("SELECT id FROM kelas WHERE kode_mk = 'IF301'").get();
  const kelasBudi = db.prepare("SELECT id FROM kelas WHERE kode_mk = 'IF302'").get();
  const nilaiEko = db.prepare("SELECT id FROM nilai WHERE kelas_id = ?").get(kelasEko.id);

  // Variabel untuk menyimpan token
  let tokenMhsAndi = '';
  let refreshMhsAndi = '';
  let tokenDosenEko = '';
  let tokenDosenBudi = '';
  let tokenAdmin = '';
  let tokenService = '';

  console.log('--- 1. AUTENTIKASI, PERANGKAT, & TOKEN (Bagian 4.1 & 5 PDF) ---');

  // T01: Login Mahasiswa (Andi)
  const resT01 = await request(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': 'DEV-MHS-ANDI-001'
    },
    body: JSON.stringify({ username: 'mhs_andi', password: 'mhs123' })
  });
  assert(resT01.status === 200 && resT01.body.access_token && resT01.body.refresh_token,
    'T01: Login Mahasiswa berhasil (200, return access_token 10m & refresh_token 1d)');
  tokenMhsAndi = resT01.body?.access_token;
  refreshMhsAndi = resT01.body?.refresh_token;

  // T02: Login Dosen (Eko)
  const resT02 = await request(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': 'DEV-DOSEN-EKO-001'
    },
    body: JSON.stringify({ username: 'dosen_eko', password: 'dosen123' })
  });
  assert(resT02.status === 200 && resT02.body.access_token,
    'T02: Login Dosen Eko berhasil (200)');
  tokenDosenEko = resT02.body?.access_token;

  // Login Dosen Budi
  const resLoginBudi = await request(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': 'DEV-DOSEN-BUDI-001'
    },
    body: JSON.stringify({ username: 'dosen_budi', password: 'dosen123' })
  });
  tokenDosenBudi = resLoginBudi.body?.access_token;

  // T03: Login Admin
  const resT03 = await request(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': 'DEV-ADMIN-001'
    },
    body: JSON.stringify({ username: 'admin1', password: 'admin123' })
  });
  assert(resT03.status === 200 && resT03.body.access_token,
    'T03: Login Admin berhasil (200)');
  tokenAdmin = resT03.body?.access_token;

  // T04: Login Gagal - Password Salah
  const resT04 = await request(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': 'DEV-MHS-ANDI-001'
    },
    body: JSON.stringify({ username: 'mhs_andi', password: 'wrongpassword' })
  });
  assert(resT04.status === 401,
    'T04: Login gagal dengan password salah (401 Unauthorized)');

  // T05: Login Gagal - Device ID Tidak Terdaftar
  const resT05 = await request(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': 'DEV-UNKNOWN-HACKER'
    },
    body: JSON.stringify({ username: 'mhs_andi', password: 'mhs123' })
  });
  assert(resT05.status === 403,
    'T05: Login gagal karena Device ID tidak terdaftar (403 Forbidden - Zero Trust Device Verification)');

  // T06: Refresh Token Berhasil
  const resT06 = await request(`${GATEWAY_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshMhsAndi })
  });
  assert(resT06.status === 200 && resT06.body.access_token,
    'T06: Refresh Token berhasil menerbitkan access token baru (200)');

  // T07: Logout (Revoke Refresh Token)
  const resT07 = await request(`${GATEWAY_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshMhsAndi })
  });
  assert(resT07.status === 200,
    'T07: Logout berhasil mencabut refresh token (200)');

  // T08: Refresh Token Gagal setelah Dicabut (Assume Breach)
  const resT08 = await request(`${GATEWAY_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshMhsAndi })
  });
  assert(resT08.status === 401,
    'T08: Refresh token yang sudah dicabut ditolak (401 Unauthorized)');

  // T09: Service Token Berhasil (Service-to-Service)
  const resT09 = await request(`${GATEWAY_URL}/auth/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: 'service-nilai',
      client_secret: 'secret-service-nilai-2026'
    })
  });
  assert(resT09.status === 200 && resT09.body.role === 'service',
    'T09: Menerbitkan Service Token berhasil (200, role: service, exp: 5m)');
  tokenService = resT09.body?.access_token;

  // T10: Service Token Gagal - Secret Salah
  const resT10 = await request(`${GATEWAY_URL}/auth/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: 'service-nilai',
      client_secret: 'wrong-secret'
    })
  });
  assert(resT10.status === 401,
    'T10: Kredensial service salah ditolak (401 Unauthorized)');


  console.log('\n--- 2. AKSES DATA NILAI (LEAST PRIVILEGE, OWNERSHIP, & JAM AKSES) ---');

  // T11: Mahasiswa Lihat Nilai Sendiri
  const resT11 = await request(`${GATEWAY_URL}/nilai`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenMhsAndi}`,
      'X-Device-ID': 'DEV-MHS-ANDI-001'
    }
  });
  assert(resT11.status === 200 && Array.isArray(resT11.body.data) && resT11.body.data.length > 0,
    'T11: Mahasiswa berhasil melihat nilai miliknya sendiri (200)');

  // T12: Dosen Lihat Nilai Kelas Ampuan
  const resT12 = await request(`${GATEWAY_URL}/nilai`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenDosenEko}`,
      'X-Device-ID': 'DEV-DOSEN-EKO-001'
    }
  });
  assert(resT12.status === 200 && Array.isArray(resT12.body.data) && resT12.body.data.every(r => r.kode_mk === 'IF301'),
    'T12: Dosen Eko hanya melihat nilai kelas ampuannya sendiri (IF301) (200)');

  // T13: Dosen Eko Ubah Nilai di Kelas Ampuannya (Jam Akses 10:00) -> 200 OK
  const resT13 = await request(`${GATEWAY_URL}/nilai/${nilaiEko.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenDosenEko}`,
      'X-Device-ID': 'DEV-DOSEN-EKO-001',
      'X-Mock-Hour': '10',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nilai_huruf: 'A', nilai_angka: 4.0 })
  });
  assert(resT13.status === 200 && resT13.body?.data?.nilai_angka === 4.0,
    'T13: Dosen Eko berhasil mengubah nilai mahasiswa dalam jam akses (200)', resT13);

  // T14: Dosen Ubah Nilai di Luar Jam Akses (Simulasi Jam 23:00) -> 403 Forbidden!
  const resT14 = await request(`${GATEWAY_URL}/nilai/${nilaiEko.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenDosenEko}`,
      'X-Device-ID': 'DEV-DOSEN-EKO-001',
      'X-Mock-Hour': '23',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nilai_huruf: 'B', nilai_angka: 3.0 })
  });
  assert(resT14.status === 403 && resT14.body?.message?.includes('jam operasional'),
    'T14: Dosen ditolak saat mengubah nilai di luar jam akses (07:00-21:00) (403)', resT14);

  // T15: Dosen Budi Coba Ubah Nilai di Kelas Eko -> Tolak Ownership!
  const resT15 = await request(`${GATEWAY_URL}/nilai/${nilaiEko.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenDosenBudi}`,
      'X-Device-ID': 'DEV-DOSEN-BUDI-001',
      'X-Mock-Hour': '10',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nilai_huruf: 'E', nilai_angka: 0.0 })
  });
  assert(resT15.status === 403,
    'T15: Dosen Budi ditolak saat mencoba ubah nilai kelas yang bukan ampuannya (403)', resT15);

  // T16: Mahasiswa Coba Ubah Nilai -> Tolak Role!
  const resT16 = await request(`${GATEWAY_URL}/nilai/${nilaiEko.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenMhsAndi}`,
      'X-Device-ID': 'DEV-MHS-ANDI-001',
      'X-Mock-Hour': '10',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nilai_huruf: 'A', nilai_angka: 4.0 })
  });
  assert(resT16.status === 403,
    'T16: Mahasiswa ditolak saat mencoba ubah nilai (403 Forbidden - Least Privilege)');


  console.log('\n--- 3. FINALISASI KELAS & SINKRONISASI TRANSKRIP (SERVICE-TO-SERVICE) ---');

  // T17: Dosen Budi Coba Finalisasi Kelas Eko -> Tolak Ownership!
  const resT17 = await request(`${GATEWAY_URL}/kelas/${kelasEko.id}/finalisasi`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDosenBudi}`,
      'X-Device-ID': 'DEV-DOSEN-BUDI-001',
      'X-Mock-Hour': '10'
    }
  });
  assert(resT17.status === 403,
    'T17: Dosen Budi ditolak saat finalisasi kelas yang bukan ampuannya (403)', resT17);

  // T18: Finalisasi di Luar Jam Akses (Simulasi Jam 22:00) -> Tolak!
  const resT18 = await request(`${GATEWAY_URL}/kelas/${kelasEko.id}/finalisasi`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDosenEko}`,
      'X-Device-ID': 'DEV-DOSEN-EKO-001',
      'X-Mock-Hour': '22'
    }
  });
  assert(resT18.status === 403,
    'T18: Finalisasi kelas di luar jam akses ditolak (403 Forbidden)', resT18);

  // T19: Dosen Eko Finalisasi Kelas Ampuannya (Jam 10:00) -> Berhasil + Pemicu Sinkronisasi
  const resT19 = await request(`${GATEWAY_URL}/kelas/${kelasEko.id}/finalisasi`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDosenEko}`,
      'X-Device-ID': 'DEV-DOSEN-EKO-001',
      'X-Mock-Hour': '10'
    }
  });
  assert(resT19.status === 200 && resT19.body?.count_synced > 0,
    'T19: Dosen Eko berhasil finalisasi kelas & sinkronisasi nilai ke transkrip via Gateway (200)', resT19);

  // T20: Dosen Eko Coba Ubah Nilai yang Sudah Difinalisasi -> Tolak Status Final!
  const resT20 = await request(`${GATEWAY_URL}/nilai/${nilaiEko.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenDosenEko}`,
      'X-Device-ID': 'DEV-DOSEN-EKO-001',
      'X-Mock-Hour': '10',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nilai_huruf: 'B', nilai_angka: 3.0 })
  });
  assert(resT20.status === 403,
    'T20: Mengubah nilai yang sudah difinalisasi ditolak (403 Forbidden - State Guard)');

  // T21: Cek Transkrip Mahasiswa Setelah Finalisasi
  const resT21 = await request(`${GATEWAY_URL}/transkrip/220101001`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenMhsAndi}`,
      'X-Device-ID': 'DEV-MHS-ANDI-001'
    }
  });
  assert(resT21.status === 200 && resT21.body.transkrip.length > 0,
    'T21: Nilai yang difinalisasi otomatis muncul di transkrip mahasiswa (200)');


  console.log('\n--- 4. HAK AKSES TRANSKRIP (LEAST PRIVILEGE) ---');

  // T22: Mahasiswa Melihat Transkrip NIM Miliknya Sendiri
  const resT22 = await request(`${GATEWAY_URL}/transkrip/220101001`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenMhsAndi}`,
      'X-Device-ID': 'DEV-MHS-ANDI-001'
    }
  });
  assert(resT22.status === 200 && resT22.body.nim === '220101001',
    'T22: Mahasiswa Andi dapat melihat transkrip NIM miliknya (200)');

  // T23: Mahasiswa Melihat Transkrip NIM Lain (Siti 220101002) -> Tolak!
  const resT23 = await request(`${GATEWAY_URL}/transkrip/220101002`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenMhsAndi}`,
      'X-Device-ID': 'DEV-MHS-ANDI-001'
    }
  });
  assert(resT23.status === 403,
    'T23: Mahasiswa ditolak saat mencoba melihat transkrip mahasiswa lain (403)');

  // T24: Admin Melihat Transkrip Mahasiswa Manapun
  const resT24 = await request(`${GATEWAY_URL}/transkrip/220101002`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenAdmin}`,
      'X-Device-ID': 'DEV-ADMIN-001'
    }
  });
  assert(resT24.status === 200 && resT24.body.nim === '220101002',
    'T24: Admin dapat melihat transkrip mahasiswa manapun (200)');

  // T25: Dosen Coba Melihat Transkrip -> Tolak (Bukan Wewenang Dosen)!
  const resT25 = await request(`${GATEWAY_URL}/transkrip/220101001`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenDosenEko}`,
      'X-Device-ID': 'DEV-DOSEN-EKO-001'
    }
  });
  assert(resT25.status === 403,
    'T25: Dosen ditolak saat mencoba melihat transkrip (403 Forbidden - Least Privilege)');


  console.log('\n--- 5. KEAMANAN SERVICE & PENCEGAHAN BYPASS (ASSUME BREACH & DEFENSE IN DEPTH) ---');

  // T26: Akses Service Nilai Langsung (:3001) Tanpa Gateway Secret -> Tolak!
  const resT26 = await request(`${NILAI_URL}/nilai`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenDosenEko}` }
  });
  assert(resT26.status === 403,
    'T26: Akses langsung ke Service Nilai (:3001) tanpa X-Gateway-Secret ditolak (403)');

  // T27: Akses Service Transkrip Langsung (:3002) Tanpa Gateway Secret -> Tolak!
  const resT27 = await request(`${TRANSKRIP_URL}/transkrip/220101001`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenAdmin}` }
  });
  assert(resT27.status === 403,
    'T27: Akses langsung ke Service Transkrip (:3002) tanpa X-Gateway-Secret ditolak (403)');

  // T28: Akses Service dengan Secret Tapi Tanpa Token -> Tolak! (Never Trust, Always Verify di Service)
  const resT28 = await request(`${NILAI_URL}/nilai`, {
    method: 'GET',
    headers: { 'X-Gateway-Secret': 'zt_gateway_internal_shared_secret_xyz789' }
  });
  assert(resT28.status === 401,
    'T28: Akses Service dengan Secret tapi tanpa Token ditolak (401 - Verifikasi Ganda)');

  // T29: Request ke Gateway Tanpa Header X-Device-ID -> Tolak!
  const resT29 = await request(`${GATEWAY_URL}/nilai`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenMhsAndi}` }
  });
  assert(resT29.status === 403,
    'T29: Request ke Gateway tanpa X-Device-ID ditolak (403 - Verifikasi Perangkat Wajib)');

  // T30: Request ke Gateway dengan Token Palsu -> Tolak!
  const resT30 = await request(`${GATEWAY_URL}/nilai`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer fake.invalid.jwttoken123',
      'X-Device-ID': 'DEV-MHS-ANDI-001'
    }
  });
  assert(resT30.status === 401,
    'T30: Request dengan token palsu ditolak oleh PEP (401 Unauthorized)');


  console.log('\n--- 6. INTEGRASI SINKRONISASI SERVICE ---');

  // T31: User Coba Panggil POST /transkrip/sinkron -> Tolak!
  const resT31 = await request(`${GATEWAY_URL}/transkrip/sinkron`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenMhsAndi}`,
      'X-Device-ID': 'DEV-MHS-ANDI-001',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ mahasiswa_id: userAndi.id, kode_mk: 'IF301', nama_mk: 'Keamanan Informasi', nilai_huruf: 'A', nilai_angka: 4.0 }])
  });
  assert(resT31.status === 403,
    'T31: User biasa ditolak memanggil /transkrip/sinkron (403 - Hanya Role Service)', resT31);

  // T32: Service Panggil POST /transkrip/sinkron dengan Token Service -> Diterima!
  const resT32 = await request(`${GATEWAY_URL}/transkrip/sinkron`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenService}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      { mahasiswa_id: userSiti.id, kode_mk: 'IF302', nama_mk: 'Kriptografi', nilai_huruf: 'A', nilai_angka: 4.0 }
    ])
  });
  assert(resT32.status === 200 && resT32.body?.records_synced === 1,
    'T32: Service token berhasil melakukan sinkronisasi transkrip (200 OK)', resT32);


  console.log('\n--- 7. AUDIT LOG & AKUNTABILITAS (ASSUME BREACH) ---');

  // T33: Admin Melihat Audit Log Lengkap
  const resT33 = await request(`${GATEWAY_URL}/audit-logs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenAdmin}`,
      'X-Device-ID': 'DEV-ADMIN-001'
    }
  });
  const hasAllow = resT33.body?.logs?.some(l => l.result === 'ALLOW');
  const hasDeny = resT33.body?.logs?.some(l => l.result === 'DENY');
  assert(resT33.status === 200 && resT33.body.count > 0 && hasAllow && hasDeny,
    'T33: Audit log mencatat riwayat keputusan ALLOW dan DENY secara lengkap (200)');

  console.log('\n=============================================================');
  console.log(` HASIL PENGUJIAN: ${passedTests} / ${totalTests} BERHASIL`);
  if (failedTests > 0) {
    console.log(` ❌ ${failedTests} TES GAGAL`);
  } else {
    console.log(' 🎉 SELURUH SKENARIO PENGUJIAN ZERO TRUST BERHASIL 100%! ');
  }
  console.log('=============================================================\n');

  // Bersihkan spawned processes jika ada
  for (const p of spawnedProcesses) {
    p.kill('SIGINT');
  }

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runAllTests().catch((err) => {
    console.error('Fatal test error:', err);
    for (const p of spawnedProcesses) {
      p.kill('SIGINT');
    }
    process.exit(1);
  });
}

module.exports = { runAllTests };
