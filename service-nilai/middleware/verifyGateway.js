const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware Verifikasi Gateway (Zero Trust: Assume Breach & Never Trust, Always Verify)
 * 1. Menolak request langsung dari klien yang mencoba membypass API Gateway (wajib X-Gateway-Secret)
 * 2. Memverifikasi ulang keabsahan tanda tangan dan masa berlaku JWT
 */
function verifyGateway(req, res, next) {
  const gatewaySecret = req.headers['x-gateway-secret'];
  const authHeader = req.headers['authorization'];

  // 1. Verifikasi Gateway Secret (Mencegah Bypass)
  if (!gatewaySecret || gatewaySecret !== config.gatewaySecret) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Akses langsung ke service ditolak. Semua request wajib melewati API Gateway.'
    });
  }

  // 2. Verifikasi Token Otentikasi
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token otentikasi tidak ditemukan pada request.'
    });
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: 'Unauthorized',
      message: isExpired ? 'Token JWT telah kedaluwarsa.' : 'Tanda tangan JWT tidak valid.'
    });
  }
}

module.exports = {
  verifyGateway
};
