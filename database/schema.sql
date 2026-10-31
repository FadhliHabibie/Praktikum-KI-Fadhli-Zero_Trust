-- Schema Database SQLite - Sistem Nilai Zero Trust

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('mahasiswa', 'dosen', 'admin')),
    full_name TEXT NOT NULL,
    nim TEXT
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kelas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_mk TEXT NOT NULL,
    nama_mk TEXT NOT NULL,
    dosen_id INTEGER NOT NULL,
    is_finalized INTEGER DEFAULT 0,
    FOREIGN KEY(dosen_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS nilai (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kelas_id INTEGER NOT NULL,
    mahasiswa_id INTEGER NOT NULL,
    nilai_huruf TEXT,
    nilai_angka REAL,
    is_final INTEGER DEFAULT 0,
    FOREIGN KEY(kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
    FOREIGN KEY(mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(kelas_id, mahasiswa_id)
);

CREATE TABLE IF NOT EXISTS transkrip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mahasiswa_id INTEGER NOT NULL,
    kode_mk TEXT NOT NULL,
    nama_mk TEXT NOT NULL,
    nilai_huruf TEXT NOT NULL,
    nilai_angka REAL NOT NULL,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(mahasiswa_id, kode_mk)
);

CREATE TABLE IF NOT EXISTS service_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT UNIQUE NOT NULL,
    client_secret_hash TEXT NOT NULL,
    service_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    subject TEXT NOT NULL,
    subject_role TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    device_id TEXT,
    result TEXT NOT NULL CHECK(result IN ('ALLOW', 'DENY')),
    reason TEXT NOT NULL,
    ip_address TEXT
);
