const { ROLES } = require('../../shared/constants');

/**
 * Daftar aturan kebijakan (Policy Rules) per endpoint
 */
const policyRules = [
  {
    pathPattern: /^\/nilai\/?$/,
    method: 'GET',
    name: 'GET_NILAI',
    allowedRoles: [ROLES.MAHASISWA, ROLES.DOSEN],
    requireDevice: true
  },
  {
    pathPattern: /^\/nilai\/(\d+)\/?$/,
    method: 'PUT',
    name: 'PUT_NILAI',
    allowedRoles: [ROLES.DOSEN],
    requireDevice: true,
    requiresAccessHours: true,
    checkOwnership: true
  },
  {
    pathPattern: /^\/kelas\/(\d+)\/finalisasi\/?$/,
    method: 'POST',
    name: 'POST_FINALISASI_KELAS',
    allowedRoles: [ROLES.DOSEN],
    requireDevice: true,
    requiresAccessHours: true,
    checkOwnership: true
  },
  {
    pathPattern: /^\/transkrip\/([^\/]+)\/?$/,
    method: 'GET',
    name: 'GET_TRANSKRIP',
    allowedRoles: [ROLES.MAHASISWA, ROLES.ADMIN],
    requireDevice: true,
    checkOwnership: true
  },
  {
    pathPattern: /^\/transkrip\/sinkron\/?$/,
    method: 'POST',
    name: 'POST_TRANSKRIP_SINKRON',
    allowedRoles: [ROLES.SERVICE],
    requireDevice: false // Komunikasi service-to-service menggunakan token service
  },
  {
    pathPattern: /^\/audit-logs\/?$/,
    method: 'GET',
    name: 'GET_AUDIT_LOGS',
    allowedRoles: [ROLES.ADMIN],
    requireDevice: true
  }
];

function matchPolicy(method, path) {
  for (const rule of policyRules) {
    if (rule.method.toUpperCase() === method.toUpperCase()) {
      const match = path.match(rule.pathPattern);
      if (match) {
        return { rule, match };
      }
    }
  }
  return null;
}

module.exports = {
  policyRules,
  matchPolicy
};
