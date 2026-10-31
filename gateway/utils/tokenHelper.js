const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { TOKEN_EXPIRY, ROLES } = require('../../shared/constants');

/**
 * Generate Access Token JWT (berlaku 10 menit, berisi minimal sub dan role)
 */
function generateAccessToken(user) {
  const payload = {
    sub: user.username,
    role: user.role,
    id: user.id,
    nim: user.nim || null,
    full_name: user.full_name
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN
  });
}

/**
 * Generate Service Token JWT (berlaku 5 menit, role: service)
 */
function generateServiceToken(service) {
  const payload = {
    sub: service.client_id,
    role: ROLES.SERVICE,
    service_name: service.service_name
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: TOKEN_EXPIRY.SERVICE_TOKEN
  });
}

/**
 * Verifikasi JWT Token
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Generate Refresh Token (random hex string, berlaku 1 hari)
 */
function generateRefreshToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return { token, expiresAt };
}

module.exports = {
  generateAccessToken,
  generateServiceToken,
  verifyToken,
  generateRefreshToken
};
