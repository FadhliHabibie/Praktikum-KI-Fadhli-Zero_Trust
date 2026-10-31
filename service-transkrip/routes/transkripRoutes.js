const express = require('express');
const db = require('../../database/db');
const { ROLES } = require('../../shared/constants');

const router = express.Router();

/**
 * GET /transkrip/:nim
 * Melihat transkrip mahasiswa berdasarkan NIM
 * Mahasiswa hanya bisa melihat NIM miliknya; Admin bisa melihat seluruh NIM.
 */
router.get('/transkrip/:nim', (req, res) => {
  const nim = req.params.nim;

  try {
    const student = db.prepare('SELECT id, username, full_name, nim FROM users WHERE nim = ?').get(nim);

    if (!student) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Mahasiswa dengan NIM ${nim} tidak ditemukan`
      });
    }

    const records = db.prepare(`
      SELECT id, kode_mk, nama_mk, nilai_huruf, nilai_angka, synced_at
      FROM transkrip
      WHERE mahasiswa_id = ?
      ORDER BY kode_mk
    `).all(student.id);

    const totalMk = records.length;
    const ipk =
      totalMk > 0
        ? (records.reduce((acc, r) => acc + (r.nilai_angka || 0), 0) / totalMk).toFixed(2)
        : '0.00';

    return res.json({
      nim: student.nim,
      nama_mahasiswa: student.full_name,
      total_mata_kuliah: totalMk,
      ipk: parseFloat(ipk),
      transkrip: records
    });
  } catch (err) {
    console.error('Error saat mengambil transkrip:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

/**
 * POST /transkrip/sinkron
 * Menerima data nilai final yang disinkronkan oleh Service Nilai
 * HANYA role 'service' yang diizinkan (Least Privilege)
 */
router.post('/transkrip/sinkron', (req, res) => {
  const user = req.user;

  // Verifikasi bahwa pemanggil adalah Service (bukan user biasa)
  if (user.role !== ROLES.SERVICE) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Hanya token service yang diizinkan memanggil endpoint sinkronisasi transkrip'
    });
  }

  const items = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Payload sinkronisasi harus berupa array data nilai yang valid'
    });
  }

  try {
    const upsertStmt = db.prepare(`
      INSERT INTO transkrip (
        mahasiswa_id, kode_mk, nama_mk, nilai_huruf, nilai_angka, synced_at
      ) VALUES (
        ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT(mahasiswa_id, kode_mk) DO UPDATE SET
        nama_mk = excluded.nama_mk,
        nilai_huruf = excluded.nilai_huruf,
        nilai_angka = excluded.nilai_angka,
        synced_at = CURRENT_TIMESTAMP
    `);

    const syncTransaction = db.transaction((grades) => {
      let count = 0;
      for (const item of grades) {
        upsertStmt.run(
          item.mahasiswa_id,
          item.kode_mk,
          item.nama_mk,
          item.nilai_huruf,
          parseFloat(item.nilai_angka)
        );
        count++;
      }
      return count;
    });

    const syncedCount = syncTransaction(items);

    return res.json({
      message: 'Sinkronisasi transkrip berhasil diproses',
      records_synced: syncedCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error saat sinkronisasi transkrip:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

module.exports = router;
