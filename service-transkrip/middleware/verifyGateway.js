const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware Verifikasi Gateway (Zero Trust: Assume Breach & Never Trust, Always Verify)
 * 1. Menolak request langsung dari luar yang tidak memiliki X-Gateway-Secret yang sah
 * 2. Memverifikasi ulang tanda tangan JWT dan masa berlaku token
 */
function verifyGateway(req, res, next) {
  const gatewaySecret = req.headers['x-gateway-secret'];
  const authHeader = req.headers['authorization'];

  // 1. Verifikasi Gateway Secret
  if (!gatewaySecret || gatewaySecret !== config.gatewaySecret) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Akses langsung ke Service Transkrip ditolak. Request wajib melewati API Gateway.'
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
