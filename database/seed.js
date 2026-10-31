const bcrypt = require('bcryptjs');
const db = require('./db');

function seed() {
  console.log('--- Memulai Seeding Database Zero Trust Sistem Nilai ---');

  // Bersihkan data lama dan reset counter ID autoincrement
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM transkrip;
    DELETE FROM nilai;
    DELETE FROM kelas;
    DELETE FROM refresh_tokens;
    DELETE FROM devices;
    DELETE FROM service_credentials;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);

  const saltRounds = 10;

  // 1. Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, nim)
    VALUES (?, ?, ?, ?, ?)
  `);

  const adminPass = bcrypt.hashSync('admin123', saltRounds);
  const dosenPass = bcrypt.hashSync('dosen123', saltRounds);
  const mhsPass = bcrypt.hashSync('mhs123', saltRounds);

  const admin1Id = insertUser.run('admin1', adminPass, 'admin', 'Administrator Sistem', null).lastInsertRowid;
  const dosenEkoId = insertUser.run('dosen_eko', dosenPass, 'dosen', 'Eko Prasetyo, M.Kom.', null).lastInsertRowid;
  const dosenBudiId = insertUser.run('dosen_budi', dosenPass, 'dosen', 'Budi Raharjo, Ph.D.', null).lastInsertRowid;
  const mhsAndiId = insertUser.run('mhs_andi', mhsPass, 'mahasiswa', 'Andi Pratama', '220101001').lastInsertRowid;
  const mhsSitiId = insertUser.run('mhs_siti', mhsPass, 'mahasiswa', 'Siti Nurhaliza', '220101002').lastInsertRowid;
  const mhsRezaId = insertUser.run('mhs_reza', mhsPass, 'mahasiswa', 'Reza Fauzi', '220101003').lastInsertRowid;

  console.log('✓ Users berhasil dibuat (1 Admin, 2 Dosen, 3 Mahasiswa)');

  // 2. Devices (Minimal 1 per user)
  const insertDevice = db.prepare(`
    INSERT INTO devices (user_id, device_id, device_name)
    VALUES (?, ?, ?)
  `);

  insertDevice.run(admin1Id, 'DEV-ADMIN-001', 'Laptop Admin Utama');
  insertDevice.run(dosenEkoId, 'DEV-DOSEN-EKO-001', 'MacBook Dosen Eko');
  insertDevice.run(dosenBudiId, 'DEV-DOSEN-BUDI-001', 'ThinkPad Dosen Budi');
  insertDevice.run(mhsAndiId, 'DEV-MHS-ANDI-001', 'HP Galaxy Andi');
  insertDevice.run(mhsSitiId, 'DEV-MHS-SITI-001', 'iPhone Siti');
  insertDevice.run(mhsRezaId, 'DEV-MHS-REZA-001', 'Laptop ASUS Reza');

  console.log('✓ Devices berhasil didaftarkan untuk setiap user');

  // 3. Kelas (Minimal 2 kelas diampu dosen berbeda)
  const insertKelas = db.prepare(`
    INSERT INTO kelas (kode_mk, nama_mk, dosen_id, is_finalized)
    VALUES (?, ?, ?, ?)
  `);

  const kelas1Id = insertKelas.run('IF301', 'Keamanan Informasi', dosenEkoId, 0).lastInsertRowid;
  const kelas2Id = insertKelas.run('IF302', 'Kriptografi', dosenBudiId, 0).lastInsertRowid;

  console.log('✓ Kelas berhasil dibuat (IF301 oleh Dosen Eko, IF302 oleh Dosen Budi)');

  // 4. Nilai Awal (Draft / is_final = 0)
  const insertNilai = db.prepare(`
    INSERT INTO nilai (kelas_id, mahasiswa_id, nilai_huruf, nilai_angka, is_final)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Nilai kelas IF301 (Dosen Eko)
  insertNilai.run(kelas1Id, mhsAndiId, 'A', 4.0, 0);
  insertNilai.run(kelas1Id, mhsSitiId, 'B+', 3.5, 0);
  insertNilai.run(kelas1Id, mhsRezaId, 'B', 3.0, 0);

  // Nilai kelas IF302 (Dosen Budi)
  insertNilai.run(kelas2Id, mhsAndiId, 'A-', 3.7, 0);
  insertNilai.run(kelas2Id, mhsSitiId, 'A', 4.0, 0);

  console.log('✓ Data nilai awal (draft) berhasil dimasukkan');

  // 5. Service Credentials (untuk Service Nilai -> Gateway -> Service Transkrip)
  const insertService = db.prepare(`
    INSERT INTO service_credentials (client_id, client_secret_hash, service_name)
    VALUES (?, ?, ?)
  `);

  const serviceSecret = process.env.SERVICE_NILAI_CLIENT_SECRET || 'secret-service-nilai-2026';
  const serviceSecretHash = bcrypt.hashSync(serviceSecret, saltRounds);

  insertService.run(
    process.env.SERVICE_NILAI_CLIENT_ID || 'service-nilai',
    serviceSecretHash,
    'Service Nilai Internal'
  );

  console.log('✓ Kredensial Service Nilai berhasil didaftarkan');
  console.log('--- Seeding Selesai dengan Sukses! ---\n');
}

if (require.main === module) {
  require('dotenv').config();
  seed();
}

module.exports = seed;
