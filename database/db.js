const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const schemaPath = path.resolve(__dirname, 'schema.sql');

// Buka koneksi database SQLite
const db = new Database(dbPath);

// Aktifkan foreign key dan WAL mode untuk konkurensi antar-service
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Inisialisasi schema jika belum ada
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

module.exports = db;
