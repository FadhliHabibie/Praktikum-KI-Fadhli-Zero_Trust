module.exports = {
  ROLES: {
    ADMIN: 'admin',
    DOSEN: 'dosen',
    MAHASISWA: 'mahasiswa',
    SERVICE: 'service'
  },
  AUDIT_RESULT: {
    ALLOW: 'ALLOW',
    DENY: 'DENY'
  },
  TOKEN_EXPIRY: {
    ACCESS_TOKEN: '10m', // 10 menit sesuai PDF
    SERVICE_TOKEN: '5m', // 5 menit sesuai PDF
    REFRESH_TOKEN_DAYS: 1 // 1 hari sesuai PDF
  }
};
