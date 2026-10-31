const express = require('express');
const db = require('../../database/db');
const { getServiceToken } = require('../utils/serviceAuth');
const config = require('../config');
const { ROLES } = require('../../shared/constants');

const router = express.Router();

/**
 * GET /nilai
 * Mahasiswa melihat nilainya sendiri. Dosen melihat nilai kelas ampuannya.
 */
router.get('/nilai', (req, res) => {
  const user = req.user;

  try {
    let queryResult;

    if (user.role === ROLES.MAHASISWA) {
      queryResult = db.prepare(`
        SELECT n.id, n.kelas_id, k.kode_mk, k.nama_mk, n.nilai_huruf, n.nilai_angka, n.is_final
        FROM nilai n
        JOIN kelas k ON n.kelas_id = k.id
        WHERE n.mahasiswa_id = ?
        ORDER BY k.kode_mk
      `).all(user.id);
    } else if (user.role === ROLES.DOSEN) {
      queryResult = db.prepare(`
        SELECT n.id, n.kelas_id, k.kode_mk, k.nama_mk, u.nim, u.full_name AS nama_mahasiswa,
               n.nilai_huruf, n.nilai_angka, n.is_final, k.is_finalized AS kelas_finalized
        FROM nilai n
        JOIN kelas k ON n.kelas_id = k.id
        JOIN users u ON n.mahasiswa_id = u.id
        WHERE k.dosen_id = ?
        ORDER BY k.kode_mk, u.nim
      `).all(user.id);
    } else {
      // Role Admin melihat seluruh nilai
      queryResult = db.prepare(`
        SELECT n.id, n.kelas_id, k.kode_mk, k.nama_mk, u.nim, u.full_name AS nama_mahasiswa,
               n.nilai_huruf, n.nilai_angka, n.is_final, k.is_finalized AS kelas_finalized
        FROM nilai n
        JOIN kelas k ON n.kelas_id = k.id
        JOIN users u ON n.mahasiswa_id = u.id
        ORDER BY k.kode_mk, u.nim
      `).all();
    }

    return res.json({
      role: user.role,
      user: user.sub,
      count: queryResult.length,
      data: queryResult
    });
  } catch (err) {
    console.error('Error saat mengambil data nilai:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

/**
 * PUT /nilai/:id
 * Dosen mengubah nilai mahasiswa di kelas ampuannya
 */
router.put('/nilai/:id', (req, res) => {
  const nilaiId = req.params.id;
  const { nilai_huruf, nilai_angka } = req.body || {};

  if (!nilai_huruf || nilai_angka === undefined || nilai_angka === null) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'nilai_huruf dan nilai_angka wajib disertakan'
    });
  }

  try {
    const updateStmt = db.prepare(`
      UPDATE nilai
      SET nilai_huruf = ?, nilai_angka = ?
      WHERE id = ?
    `);

    const result = updateStmt.run(nilai_huruf, parseFloat(nilai_angka), nilaiId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Data nilai dengan ID ${nilaiId} tidak ditemukan`
      });
    }

    const updatedData = db.prepare(`
      SELECT n.*, k.kode_mk, k.nama_mk, u.nim, u.full_name AS nama_mahasiswa
      FROM nilai n
      JOIN kelas k ON n.kelas_id = k.id
      JOIN users u ON n.mahasiswa_id = u.id
      WHERE n.id = ?
    `).get(nilaiId);

    return res.json({
      message: 'Nilai berhasil diperbarui',
      data: updatedData
    });
  } catch (err) {
    console.error('Error saat memperbarui nilai:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

/**
 * POST /kelas/:id/finalisasi
 * Dosen memfinalisasi seluruh nilai kelas -> memicu sinkronisasi ke Service Transkrip melalui Gateway
 */
router.post('/kelas/:id/finalisasi', async (req, res) => {
  const kelasId = req.params.id;

  try {
    // 1. Tandai seluruh nilai pada kelas ini sebagai final
    db.prepare('UPDATE nilai SET is_final = 1 WHERE kelas_id = ?').run(kelasId);
    db.prepare('UPDATE kelas SET is_finalized = 1 WHERE id = ?').run(kelasId);

    // 2. Ambil seluruh data nilai final kelas ini
    const grades = db.prepare(`
      SELECT n.mahasiswa_id, k.kode_mk, k.nama_mk, n.nilai_huruf, n.nilai_angka
      FROM nilai n
      JOIN kelas k ON n.kelas_id = k.id
      WHERE n.kelas_id = ?
    `).all(kelasId);

    // 3. Komunikasi Service-to-Service: Service Nilai meminta Service Token ke Gateway
    console.log(`[SERVICE NILAI] Meminta token service ke Gateway untuk finalisasi kelas ${kelasId}...`);
    const serviceToken = await getServiceToken();

    // 4. Kirim data sinkronisasi ke Service Transkrip MELALUI Gateway
    console.log(`[SERVICE NILAI] Mengirim ${grades.length} record nilai ke Gateway /transkrip/sinkron...`);
    const syncResponse = await fetch(`${config.gatewayUrl}/transkrip/sinkron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceToken}`
      },
      body: JSON.stringify(grades)
    });

    if (!syncResponse.ok) {
      const errBody = await syncResponse.json().catch(() => ({}));
      console.error('[SERVICE NILAI] Gagal sinkronisasi transkrip:', errBody);
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'Finalisasi berhasil di Service Nilai, tetapi sinkronisasi ke Service Transkrip gagal',
        details: errBody
      });
    }

    const syncResult = await syncResponse.json();

    return res.json({
      message: 'Kelas berhasil difinalisasi dan nilai telah disinkronkan ke transkrip',
      kelas_id: parseInt(kelasId, 10),
      count_synced: grades.length,
      transkrip_sync_result: syncResult
    });
  } catch (err) {
    console.error('Error saat finalisasi kelas:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

module.exports = router;
