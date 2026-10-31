const db = require('../../database/db');

/**
 * Mencatat keputusan Policy Enforcement Point (PEP) atau Auth ke tabel audit_logs
 */
function logAudit({
  subject = 'anonymous',
  subject_role = null,
  endpoint,
  method,
  device_id = null,
  result,
  reason,
  ip_address = '127.0.0.1'
}) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        timestamp, subject, subject_role, endpoint, method, device_id, result, reason, ip_address
      ) VALUES (
        CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      subject,
      subject_role,
      endpoint,
      method,
      device_id,
      result,
      reason,
      ip_address
    );
  } catch (err) {
    console.error('Gagal mencatat audit log:', err.message);
  }
}

module.exports = {
  logAudit
};
