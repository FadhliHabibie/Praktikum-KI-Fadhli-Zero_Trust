const { evaluatePolicy } = require('../policy/policyEngine');
const { logAudit } = require('./auditLogger');
const { AUDIT_RESULT } = require('../../shared/constants');

/**
 * Policy Enforcement Point (PEP) Middleware
 * Berperan sebagai pintu gerbang yang menegakkan setiap keputusan kebijakan
 * dari Policy Engine dan mencatat seluruh percobaan akses ke audit log.
 */
function pepMiddleware(req, res, next) {
  const ipAddress = req.ip || req.connection.remoteAddress;

  // Evaluasi kebijakan oleh Policy Engine
  const decision = evaluatePolicy(req);

  // Catat keputusan ke audit_logs (Zero Trust: Never Trust, Always Verify & Assume Breach)
  logAudit({
    subject: decision.subject || 'anonymous',
    subject_role: decision.subject_role || null,
    endpoint: req.originalUrl || req.path,
    method: req.method,
    device_id: decision.device_id || null,
    result: decision.allowed ? AUDIT_RESULT.ALLOW : AUDIT_RESULT.DENY,
    reason: decision.reason,
    ip_address: ipAddress
  });

  if (!decision.allowed) {
    const errorType =
      decision.status === 401
        ? 'Unauthorized'
        : decision.status === 403
        ? 'Forbidden'
        : decision.status === 404
        ? 'Not Found'
        : 'Bad Request';

    return res.status(decision.status).json({
      error: errorType,
      message: decision.reason
    });
  }

  // Jika diizinkan, pasang data user ke objek request dan teruskan ke proxy
  req.user = decision.user;
  next();
}

module.exports = {
  pepMiddleware
};
