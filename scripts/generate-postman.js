const fs = require('fs');
const path = require('path');

const collection = {
  info: {
    name: "Zero Trust Security - Sistem Nilai & Transkrip",
    _postman_id: "zt-sistem-nilai-collection",
    description: "Postman Collection untuk Pengujian & Demonstrasi Praktikum Zero Trust Security Sistem Nilai (NIST SP 800-207)",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "nilaiUrl", value: "http://localhost:3001" },
    { key: "transkripUrl", value: "http://localhost:3002" },
    { key: "token_mhs_andi", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtaHNfYW5kaSIsInJvbGUiOiJtYWhhc2lzd2EiLCJpZCI6NCwibmltIjoiMjIwMTAxMDAxIiwiZnVsbF9uYW1lIjoiQW5kaSBQcmF0YW1hIiwiaWF0IjoxNzkzNDI4ODgwLCJleHAiOjE3OTQwMzM2ODB9.oWPMdSnmFhYvI2_ouAWHGTDNzhrc7YrnpWuKm6YITcI" },
    { key: "refresh_mhs_andi", value: "" },
    { key: "token_dosen_eko", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkb3Nlbl9la28iLCJyb2xlIjoiZG9zZW4iLCJpZCI6MiwiZnVsbF9uYW1lIjoiRWtvIFNldGlhd2FuLCBNLktvbS4iLCJpYXQiOjE3OTM0Mjg4ODAsImV4cCI6MTc5NDAzMzY4MH0.igNK9rjRRQ9D89idx-JoeDaPiOULjNyUrYI85mdBlOk" },
    { key: "token_dosen_budi", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkb3Nlbl9idWRpIiwicm9sZSI6ImRvc2VuIiwiaWQiOjMsImZ1bGxfbmFtZSI6IkJ1ZGkgUmFoYXJqbywgUGguRC4iLCJpYXQiOjE3OTM0Mjg4ODAsImV4cCI6MTc5NDAzMzY4MH0.5wYtzayycuKn96vvDnnn9JBOLx8QKfTRU0Zkiphp8ZI" },
    { key: "token_admin", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbjEiLCJyb2xlIjoiYWRtaW4iLCJpZCI6MSwiZnVsbF9uYW1lIjoiQWRtaW5pc3RyYXRvciBBa2FkZW1payIsImlhdCI6MTc5MzQyODg4MCwiZXhwIjoxNzk0MDMzNjgwfQ.aLouZR7-irfSLLNciWPSxhkgBL5rK5GTWGb0fXDsFZ8" },
    { key: "token_service", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZXJ2aWNlLW5pbGFpIiwicm9sZSI6InNlcnZpY2UiLCJzZXJ2aWNlX25hbWUiOiJTZXJ2aWNlIE5pbGFpIiwiaWF0IjoxNzkzNDI4ODgwLCJleHAiOjE3OTQwMzM2ODB9.-OXAjcDBll5SojXHVJ0TR4Ei3lNeCWPL09c7qVAWtqE" }
  ],
  item: [
    {
      name: "1. Autentikasi & Token",
      item: [
        {
          name: "T01 - Login Mahasiswa (Andi)",
          event: [{
            listen: "test",
            script: {
              exec: [
                "const json = pm.response.json();",
                "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                "pm.test('Has access & refresh token', () => {",
                "    pm.expect(json.access_token).to.be.a('string');",
                "    pm.expect(json.refresh_token).to.be.a('string');",
                "    pm.collectionVariables.set('token_mhs_andi', json.access_token);",
                "    pm.collectionVariables.set('refresh_mhs_andi', json.refresh_token);",
                "});"
              ]
            }
          }],
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ username: "mhs_andi", password: "mhs123" }, null, 2)
            },
            url: "{{baseUrl}}/auth/login"
          }
        },
        {
          name: "T02 - Login Dosen (Eko)",
          event: [{
            listen: "test",
            script: {
              exec: [
                "const json = pm.response.json();",
                "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                "pm.collectionVariables.set('token_dosen_eko', json.access_token);"
              ]
            }
          }],
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ username: "dosen_eko", password: "dosen123" }, null, 2)
            },
            url: "{{baseUrl}}/auth/login"
          }
        },
        {
          name: "T03 - Login Admin",
          event: [{
            listen: "test",
            script: {
              exec: [
                "const json = pm.response.json();",
                "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                "pm.collectionVariables.set('token_admin', json.access_token);"
              ]
            }
          }],
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Device-ID", value: "DEV-ADMIN-001" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ username: "admin1", password: "admin123" }, null, 2)
            },
            url: "{{baseUrl}}/auth/login"
          }
        },
        {
          name: "T04 - Login Gagal (Password Salah)",
          event: [{
            listen: "test",
            script: { exec: ["pm.test('Status code 401', () => pm.response.to.have.status(401));"] }
          }],
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ username: "mhs_andi", password: "passwordsalah" }, null, 2)
            },
            url: "{{baseUrl}}/auth/login"
          }
        },
        {
          name: "T05 - Login Gagal (Device Tidak Terdaftar)",
          event: [{
            listen: "test",
            script: { exec: ["pm.test('Status code 403', () => pm.response.to.have.status(403));"] }
          }],
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Device-ID", value: "DEV-UNKNOWN-HACKER" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ username: "mhs_andi", password: "mhs123" }, null, 2)
            },
            url: "{{baseUrl}}/auth/login"
          }
        },
        {
          name: "T06 - Refresh Token",
          event: [{
            listen: "test",
            script: {
              exec: [
                "const json = pm.response.json();",
                "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                "pm.expect(json.access_token).to.be.a('string');"
              ]
            }
          }],
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ refresh_token: "{{refresh_mhs_andi}}" }, null, 2)
            },
            url: "{{baseUrl}}/auth/refresh"
          }
        },
        {
          name: "T07 - Logout (Revoke Refresh Token)",
          event: [{
            listen: "test",
            script: { exec: ["pm.test('Status code 200', () => pm.response.to.have.status(200));"] }
          }],
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ refresh_token: "{{refresh_mhs_andi}}" }, null, 2)
            },
            url: "{{baseUrl}}/auth/logout"
          }
        },
        {
          name: "T08 - Refresh Token Ditolak (Setelah Revoke)",
          event: [{
            listen: "test",
            script: { exec: ["pm.test('Status code 401', () => pm.response.to.have.status(401));"] }
          }],
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ refresh_token: "{{refresh_mhs_andi}}" }, null, 2)
            },
            url: "{{baseUrl}}/auth/refresh"
          }
        },
        {
          name: "T09 - Service Token Berhasil",
          event: [{
            listen: "test",
            script: {
              exec: [
                "const json = pm.response.json();",
                "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                "pm.collectionVariables.set('token_service', json.access_token);"
              ]
            }
          }],
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ client_id: "service-nilai", client_secret: "secret-service-nilai-2026" }, null, 2)
            },
            url: "{{baseUrl}}/auth/service"
          }
        },
        {
          name: "T10 - Service Token Gagal (Secret Salah)",
          event: [{
            listen: "test",
            script: { exec: ["pm.test('Status code 401', () => pm.response.to.have.status(401));"] }
          }],
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ client_id: "service-nilai", client_secret: "secretsalah" }, null, 2)
            },
            url: "{{baseUrl}}/auth/service"
          }
        }
      ]
    },
    {
      name: "2. Akses Data Nilai",
      item: [
        {
          name: "T11 - Mahasiswa Lihat Nilai Sendiri",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_mhs_andi}}" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" }
            ],
            url: "{{baseUrl}}/nilai"
          }
        },
        {
          name: "T12 - Dosen Eko Lihat Nilai Kelas Ampuannya",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_eko}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" }
            ],
            url: "{{baseUrl}}/nilai"
          }
        },
        {
          name: "T13 - Dosen Eko Ubah Nilai (Jam Akses)",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_eko}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" },
              { key: "X-Mock-Hour", value: "10" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ nilai_huruf: "A", nilai_angka: 4.0 }, null, 2)
            },
            url: "{{baseUrl}}/nilai/1"
          }
        },
        {
          name: "T14 - Dosen Ubah Nilai di Luar Jam Akses (Simulasi Jam 23:00)",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_eko}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" },
              { key: "X-Mock-Hour", value: "23" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ nilai_huruf: "B", nilai_angka: 3.0 }, null, 2)
            },
            url: "{{baseUrl}}/nilai/1"
          }
        },
        {
          name: "T15 - Dosen Budi Coba Ubah Nilai Kelas Eko (Ditolak)",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_budi}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-BUDI-001" },
              { key: "X-Mock-Hour", value: "10" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ nilai_huruf: "E", nilai_angka: 0.0 }, null, 2)
            },
            url: "{{baseUrl}}/nilai/1"
          }
        },
        {
          name: "T16 - Mahasiswa Coba Ubah Nilai (Ditolak)",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token_mhs_andi}}" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" },
              { key: "X-Mock-Hour", value: "10" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ nilai_huruf: "A", nilai_angka: 4.0 }, null, 2)
            },
            url: "{{baseUrl}}/nilai/1"
          }
        }
      ]
    },
    {
      name: "3. Finalisasi & Sinkronisasi",
      item: [
        {
          name: "T17 - Finalisasi Bukan Kelas Ampuan (Ditolak)",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_budi}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-BUDI-001" },
              { key: "X-Mock-Hour", value: "10" }
            ],
            url: "{{baseUrl}}/kelas/1/finalisasi"
          }
        },
        {
          name: "T18 - Finalisasi di Luar Jam Akses (Ditolak)",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_eko}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" },
              { key: "X-Mock-Hour", value: "23" }
            ],
            url: "{{baseUrl}}/kelas/1/finalisasi"
          }
        },
        {
          name: "T19 - Dosen Eko Finalisasi Kelas Ampuan (Berhasil)",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_eko}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" },
              { key: "X-Mock-Hour", value: "10" }
            ],
            url: "{{baseUrl}}/kelas/1/finalisasi"
          }
        },
        {
          name: "T20 - Dosen Ubah Nilai yang Sudah Final (Ditolak)",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_eko}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" },
              { key: "X-Mock-Hour", value: "10" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ nilai_huruf: "B", nilai_angka: 3.0 }, null, 2)
            },
            url: "{{baseUrl}}/nilai/1"
          }
        },
        {
          name: "T21 - Cek Transkrip Setelah Finalisasi",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_mhs_andi}}" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" }
            ],
            url: "{{baseUrl}}/transkrip/220101001"
          }
        }
      ]
    },
    {
      name: "4. Akses Transkrip",
      item: [
        {
          name: "T22 - Mahasiswa Lihat Transkrip Sendiri",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_mhs_andi}}" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" }
            ],
            url: "{{baseUrl}}/transkrip/220101001"
          }
        },
        {
          name: "T23 - Mahasiswa Lihat Transkrip Orang Lain (Ditolak)",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_mhs_andi}}" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" }
            ],
            url: "{{baseUrl}}/transkrip/220101002"
          }
        },
        {
          name: "T24 - Admin Lihat Transkrip Mahasiswa Manapun",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_admin}}" },
              { key: "X-Device-ID", value: "DEV-ADMIN-001" }
            ],
            url: "{{baseUrl}}/transkrip/220101002"
          }
        },
        {
          name: "T25 - Dosen Coba Lihat Transkrip (Ditolak)",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_eko}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" }
            ],
            url: "{{baseUrl}}/transkrip/220101001"
          }
        }
      ]
    },
    {
      name: "5. Pencegahan Bypass & Gateway Secret",
      item: [
        {
          name: "T26 - Akses Langsung Service Nilai :3001 (Ditolak)",
          request: {
            method: "GET",
            header: [],
            url: "{{nilaiUrl}}/nilai"
          }
        },
        {
          name: "T27 - Akses Langsung Service Transkrip :3002 (Ditolak)",
          request: {
            method: "GET",
            header: [],
            url: "{{transkripUrl}}/transkrip/220101001"
          }
        },
        {
          name: "T28 - Akses dengan Gateway Secret tapi Tanpa Token (Ditolak)",
          request: {
            method: "GET",
            header: [
              { key: "X-Gateway-Secret", value: "gateway-internal-secret-2026-key" }
            ],
            url: "{{nilaiUrl}}/nilai"
          }
        },
        {
          name: "T29 - Request Gateway Tanpa X-Device-ID (Ditolak)",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_mhs_andi}}" }
            ],
            url: "{{baseUrl}}/nilai"
          }
        },
        {
          name: "T30 - Request Gateway dengan Token Palsu (Ditolak)",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer invalid.fake.token" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" }
            ],
            url: "{{baseUrl}}/nilai"
          }
        }
      ]
    },
    {
      name: "6. Sinkronisasi Service",
      item: [
        {
          name: "T31 - User Coba Panggil /transkrip/sinkron (Ditolak)",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token_dosen_eko}}" },
              { key: "X-Device-ID", value: "DEV-DOSEN-EKO-001" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify([{ mahasiswa_id: 4, kode_mk: "IF301", nama_mk: "Keamanan Informasi", nilai_huruf: "A", nilai_angka: 4.0 }], null, 2)
            },
            url: "{{baseUrl}}/transkrip/sinkron"
          }
        },
        {
          name: "T32 - Service Token Panggil /transkrip/sinkron (Berhasil)",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token_service}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify([{ mahasiswa_id: 4, kode_mk: "IF301", nama_mk: "Keamanan Informasi", nilai_huruf: "A", nilai_angka: 4.0 }], null, 2)
            },
            url: "{{baseUrl}}/transkrip/sinkron"
          }
        }
      ]
    },
    {
      name: "7. Audit Log",
      item: [
        {
          name: "T33a - Mahasiswa Coba Lihat Audit Log (Ditolak)",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_mhs_andi}}" },
              { key: "X-Device-ID", value: "DEV-MHS-ANDI-001" }
            ],
            url: "{{baseUrl}}/audit-logs"
          }
        },
        {
          name: "T33b - Admin Lihat Audit Log (Berhasil)",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token_admin}}" },
              { key: "X-Device-ID", value: "DEV-ADMIN-001" }
            ],
            url: "{{baseUrl}}/audit-logs"
          }
        }
      ]
    }
  ]
};

const outputPath = path.resolve('d:/Materi SMT 5/kai/praktikum/postman/zero_trust_sistem_nilai.postman_collection.json');
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');
console.log('Successfully created', outputPath);
