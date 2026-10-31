const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../database/db');
const {
  generateAccessToken,
  generateServiceToken,
  generateRefreshToken
} = require('../utils/tokenHelper');
const { logAudit } = require('../middleware/auditLogger');
const { AUDIT_RESULT } = require('../../shared/constants');

const router = express.Router();

/**
 * POST /auth/login
 * Autentikasi user (username + password) dengan verifikasi perangkat terdaftar (X-Device-ID)
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const deviceId = req.headers['x-device-id'];
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Username dan password wajib diisi'
    });
  }

  // Cari user
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAudit({
      subject: username,
      subject_role: null,
      endpoint: '/auth/login',
      method: 'POST',
      device_id: deviceId || null,
      result: AUDIT_RESULT.DENY,
      reason: 'Invalid credentials',
      ip_address: ipAddress
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Username atau password salah'
    });
  }

  // Verifikasi Device ID (Never Trust, Always Verify & Konteks Perangkat)
  if (!deviceId) {
    logAudit({
      subject: user.username,
      subject_role: user.role,
      endpoint: '/auth/login',
      method: 'POST',
      device_id: null,
      result: AUDIT_RESULT.DENY,
      reason: 'Missing X-Device-ID header',
      ip_address: ipAddress
    });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Header X-Device-ID wajib disertakan'
    });
  }

  const registeredDevice = db.prepare(`
    SELECT * FROM devices WHERE user_id = ? AND device_id = ?
  `).get(user.id, deviceId);

  if (!registeredDevice) {
    logAudit({
      subject: user.username,
      subject_role: user.role,
      endpoint: '/auth/login',
      method: 'POST',
      device_id: deviceId,
      result: AUDIT_RESULT.DENY,
      reason: 'Device not registered for this user',
      ip_address: ipAddress
    });
    return res.status(403).json({
      error: 'Forbidden',
      message: `Perangkat ${deviceId} tidak terdaftar untuk pengguna ${user.username}`
    });
  }

  // Buat Access Token (10 menit) dan Refresh Token (1 hari)
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, expiresAt } = generateRefreshToken();

  // Simpan Refresh Token di Database
  db.prepare(`
    INSERT INTO refresh_tokens (user_id, token, expires_at, revoked)
    VALUES (?, ?, ?, 0)
  `).run(user.id, refreshToken, expiresAt);

  logAudit({
    subject: user.username,
    subject_role: user.role,
    endpoint: '/auth/login',
    method: 'POST',
    device_id: deviceId,
    result: AUDIT_RESULT.ALLOW,
    reason: 'Login successful',
    ip_address: ipAddress
  });

  return res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 600, // 10 menit dalam detik
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      nim: user.nim
    }
  });
});

/**
 * POST /auth/refresh
 * Menerbitkan access token baru menggunakan refresh token yang belum dicabut
 */
router.post('/refresh', (req, res) => {
  const { refresh_token } = req.body || {};
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!refresh_token) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'refresh_token wajib disertakan'
    });
  }

  const tokenRecord = db.prepare(`
    SELECT rt.*, u.username, u.role, u.full_name, u.nim, u.id as user_id
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token = ?
  `).get(refresh_token);

  const isExpired = tokenRecord && new Date(tokenRecord.expires_at) < new Date();

  if (!tokenRecord || tokenRecord.revoked === 1 || isExpired) {
    const reason = !tokenRecord
      ? 'Refresh token not found'
      : tokenRecord.revoked === 1
      ? 'Refresh token has been revoked'
      : 'Refresh token expired';

    logAudit({
      subject: tokenRecord ? tokenRecord.username : 'unknown',
      subject_role: tokenRecord ? tokenRecord.role : null,
      endpoint: '/auth/refresh',
      method: 'POST',
      result: AUDIT_RESULT.DENY,
      reason: reason,
      ip_address: ipAddress
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: `Refresh token tidak valid: ${reason}`
    });
  }

  const user = {
    id: tokenRecord.user_id,
    username: tokenRecord.username,
    role: tokenRecord.role,
    full_name: tokenRecord.full_name,
    nim: tokenRecord.nim
  };

  const newAccessToken = generateAccessToken(user);

  logAudit({
    subject: user.username,
    subject_role: user.role,
    endpoint: '/auth/refresh',
    method: 'POST',
    result: AUDIT_RESULT.ALLOW,
    reason: 'Token refreshed successfully',
    ip_address: ipAddress
  });

  return res.json({
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: 600
  });
});

/**
 * POST /auth/logout
 * Mencabut (revoke) refresh token
 */
router.post('/logout', (req, res) => {
  const { refresh_token } = req.body || {};
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!refresh_token) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'refresh_token wajib disertakan'
    });
  }

  const tokenRecord = db.prepare(`
    SELECT rt.*, u.username, u.role
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token = ?
  `).get(refresh_token);

  if (!tokenRecord || tokenRecord.revoked === 1) {
    logAudit({
      subject: tokenRecord ? tokenRecord.username : 'unknown',
      subject_role: tokenRecord ? tokenRecord.role : null,
      endpoint: '/auth/logout',
      method: 'POST',
      result: AUDIT_RESULT.DENY,
      reason: 'Invalid or already revoked refresh token',
      ip_address: ipAddress
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Refresh token tidak valid atau sudah dicabut'
    });
  }

  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?').run(refresh_token);

  logAudit({
    subject: tokenRecord.username,
    subject_role: tokenRecord.role,
    endpoint: '/auth/logout',
    method: 'POST',
    result: AUDIT_RESULT.ALLOW,
    reason: 'Logout successful, refresh token revoked',
    ip_address: ipAddress
  });

  return res.json({
    message: 'Logout berhasil, refresh token telah dicabut'
  });
});

/**
 * POST /auth/service
 * Autentikasi antar-service (Client ID & Client Secret) -> menghasilkan Service Token (5 menit)
 */
router.post('/service', (req, res) => {
  const { client_id, client_secret } = req.body || {};
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!client_id || !client_secret) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'client_id dan client_secret wajib diisi'
    });
  }

  const cred = db.prepare('SELECT * FROM service_credentials WHERE client_id = ?').get(client_id);

  if (!cred || !bcrypt.compareSync(client_secret, cred.client_secret_hash)) {
    logAudit({
      subject: client_id || 'unknown',
      subject_role: 'service',
      endpoint: '/auth/service',
      method: 'POST',
      result: AUDIT_RESULT.DENY,
      reason: 'Invalid service credentials',
      ip_address: ipAddress
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Kredensial service tidak valid'
    });
  }

  const serviceToken = generateServiceToken(cred);

  logAudit({
    subject: cred.client_id,
    subject_role: 'service',
    endpoint: '/auth/service',
    method: 'POST',
    result: AUDIT_RESULT.ALLOW,
    reason: 'Service token issued successfully',
    ip_address: ipAddress
  });

  return res.json({
    access_token: serviceToken,
    token_type: 'Bearer',
    expires_in: 300, // 5 menit dalam detik
    role: 'service'
  });
});

module.exports = router;
