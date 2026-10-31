require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT_GATEWAY || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'zero_trust_super_secret_jwt_key_2026_unsil',
  gatewaySecret: process.env.GATEWAY_SECRET || 'zt_gateway_internal_shared_secret_xyz789',
  accessHours: {
    start: parseInt(process.env.ACCESS_HOUR_START || '7', 10),
    end: parseInt(process.env.ACCESS_HOUR_END || '21', 10)
  },
  services: {
    nilaiUrl: process.env.SERVICE_NILAI_URL || 'http://localhost:3001',
    transkripUrl: process.env.SERVICE_TRANSKRIP_URL || 'http://localhost:3002'
  }
};
