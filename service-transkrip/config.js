require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT_TRANSKRIP || '3002', 10),
  gatewaySecret: process.env.GATEWAY_SECRET || 'zt_gateway_internal_shared_secret_xyz789',
  jwtSecret: process.env.JWT_SECRET || 'zero_trust_super_secret_jwt_key_2026_unsil'
};
