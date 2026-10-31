const db = require('../../database/db');
const config = require('../config');
const { verifyToken } = require('../utils/tokenHelper');
const { matchPolicy } = require('./policyRules');
const { ROLES } = require('../../shared/constants');

/**
 * Policy Engine / Policy Administrator
 * Menerima request HTTP, mengevaluasi kebijakan keamanan context-aware,
 * dan mengembalikan keputusan allow/deny beserta alasan dan status HTTP.
 */
function evaluatePolicy(req) {
  const method = req.method;
  const path = req.path;
  const authHeader = req.headers['authorization'];
  const deviceId = req.headers['x-device-id'];

  // 1. Cek Policy Whitelist untuk endpoint ini
  const policyMatch = matchPolicy(method, path);
  if (!policyMatch) {
    return {
      allowed: false,
      status: 404,
      reason: `Endpoint ${method} ${path} tidak diizinkan atau tidak ditemukan dalam daftar kebijakan whitelist`,
      subject: 'unknown',
      subject_role: null,
      device_id: deviceId || null
    };
  }

  const { rule, match } = policyMatch;

  // 2. Verifikasi Bearer Token (Never Trust, Always Verify)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      allowed: false,
      status: 401,
      reason: 'Token otentikasi tidak ditemukan (Bearer token required)',
      subject: 'anonymous',
      subject_role: null,
      device_id: deviceId || null
    };
  }

  const token = authHeader.substring(7).trim();
  let decodedUser;
  try {
    decodedUser = verifyToken(token);
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return {
      allowed: false,
      status: 401,
      reason: isExpired ? 'Access token has expired' : 'Invalid access token signature',
      subject: 'invalid_token',
      subject_role: null,
      device_id: deviceId || null
    };
  }

  const subject = decodedUser.sub || decodedUser.username || 'unknown';
  const subjectRole = decodedUser.role;

  // 3. Verifikasi Perangkat (Konteks Device)
  if (rule.requireDevice) {
    if (!deviceId) {
      return {
        allowed: false,
        status: 403,
        reason: 'Header X-Device-ID wajib disertakan untuk mengakses sumber daya ini',
        subject,
        subject_role: subjectRole,
        device_id: null
      };
    }

    const registeredDevice = db.prepare(`
      SELECT * FROM devices WHERE user_id = ? AND device_id = ?
    `).get(decodedUser.id, deviceId);

    if (!registeredDevice) {
      return {
        allowed: false,
        status: 403,
        reason: `Perangkat ${deviceId} tidak terdaftar untuk pengguna ${subject}`,
        subject,
        subject_role: subjectRole,
        device_id: deviceId
      };
    }
  }

  // 4. Role-Based Access Control (Least Privilege)
  if (!rule.allowedRoles.includes(subjectRole)) {
    return {
      allowed: false,
      status: 403,
      reason: `Role '${subjectRole}' tidak memiliki hak akses ke endpoint ${method} ${path}`,
      subject,
      subject_role: subjectRole,
      device_id: deviceId || null
    };
  }

  // 5. Cek Jam Akses (Konteks Waktu: 07.00 - 21.00 secara default, mendukung simulasi demo X-Mock-Hour)
  if (rule.requiresAccessHours) {
    const mockHourHeader = req.headers['x-mock-hour'];
    const currentHour =
      mockHourHeader !== undefined && mockHourHeader !== ''
        ? parseInt(mockHourHeader, 10)
        : new Date().getHours();

    const { start, end } = config.accessHours;
    if (currentHour < start || currentHour >= end) {
      return {
        allowed: false,
        status: 403,
        reason: `Akses ditolak di luar jam operasional (${String(start).padStart(2, '0')}:00 - ${String(end).padStart(2, '0')}:00). Jam akses: ${currentHour}:00`,
        subject,
        subject_role: subjectRole,
        device_id: deviceId || null
      };
    }
  }

  // 6. Cek Atribut Kepemilikan & Status Data (Attribute-Based Access Control)
  if (rule.name === 'PUT_NILAI') {
    const nilaiId = match[1];
    const nilaiRecord = db.prepare(`
      SELECT n.*, k.dosen_id, k.is_finalized AS kelas_finalized
      FROM nilai n
      JOIN kelas k ON n.kelas_id = k.id
      WHERE n.id = ?
    `).get(nilaiId);

    if (!nilaiRecord) {
      return {
        allowed: false,
        status: 404,
        reason: `Data nilai dengan ID ${nilaiId} tidak ditemukan`,
        subject,
        subject_role: subjectRole,
        device_id: deviceId || null
      };
    }

    // Hanya dosen yang mengampu kelas tersebut yang boleh mengubah
    if (nilaiRecord.dosen_id !== decodedUser.id) {
      return {
        allowed: false,
        status: 403,
        reason: `Dosen '${subject}' bukan pengampu kelas dari data nilai ID ${nilaiId}`,
        subject,
        subject_role: subjectRole,
        device_id: deviceId || null
      };
    }

    // Nilai yang sudah difinalisasi tidak boleh diubah
    if (nilaiRecord.is_final === 1 || nilaiRecord.kelas_finalized === 1) {
      return {
        allowed: false,
        status: 403,
        reason: `Nilai ID ${nilaiId} sudah difinalisasi dan tidak dapat diubah lagi`,
        subject,
        subject_role: subjectRole,
        device_id: deviceId || null
      };
    }
  }

  if (rule.name === 'POST_FINALISASI_KELAS') {
    const kelasId = match[1];
    const kelasRecord = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kelasId);

    if (!kelasRecord) {
      return {
        allowed: false,
        status: 404,
        reason: `Kelas dengan ID ${kelasId} tidak ditemukan`,
        subject,
        subject_role: subjectRole,
        device_id: deviceId || null
      };
    }

    // Hanya dosen pengampu yang boleh memfinalisasi kelas
    if (kelasRecord.dosen_id !== decodedUser.id) {
      return {
        allowed: false,
        status: 403,
        reason: `Dosen '${subject}' bukan pengampu kelas ID ${kelasId}`,
        subject,
        subject_role: subjectRole,
        device_id: deviceId || null
      };
    }
  }

  if (rule.name === 'GET_TRANSKRIP') {
    const requestedNim = match[1];
    if (subjectRole === ROLES.MAHASISWA) {
      if (decodedUser.nim !== requestedNim) {
        return {
          allowed: false,
          status: 403,
          reason: `Mahasiswa hanya diperbolehkan melihat transkrip miliknya sendiri (NIM ${decodedUser.nim})`,
          subject,
          subject_role: subjectRole,
          device_id: deviceId || null
        };
      }
    }
    // Role ADMIN diizinkan melihat semua NIM
  }

  if (rule.name === 'POST_TRANSKRIP_SINKRON') {
    if (subjectRole !== ROLES.SERVICE) {
      return {
        allowed: false,
        status: 403,
        reason: 'Hanya token dengan role service yang diizinkan melakukan sinkronisasi transkrip',
        subject,
        subject_role: subjectRole,
        device_id: deviceId || null
      };
    }
  }

  // Semua evaluasi lolos: ALLOW
  return {
    allowed: true,
    user: decodedUser,
    subject,
    subject_role: subjectRole,
    device_id: deviceId || null,
    reason: `Allowed by policy rule ${rule.name}`
  };
}

module.exports = {
  evaluatePolicy
};
