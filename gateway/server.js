const express = require('express');
const config = require('./config');
const db = require('../database/db');
const authRoutes = require('./routes/authRoutes');
const { pepMiddleware } = require('./middleware/pepMiddleware');
const { setupProxies } = require('./proxy/proxySetup');

const app = express();

// Middleware parsing JSON body
app.use(express.json());

// Logging ringkas setiap request masuk ke Gateway
app.use((req, res, next) => {
  console.log(`[GATEWAY :${config.port}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint (tanpa autentikasi)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    component: 'API Gateway (PEP)',
    port: config.port,
    timestamp: new Date().toISOString()
  });
});

// Endpoint Autentikasi (ditangani langsung oleh Gateway)
app.use('/auth', authRoutes);

// Policy Enforcement Point (PEP) Middleware
// Setiap request ke route selain /auth dan /health WAJIB melalui evaluasi Policy Engine
app.use(pepMiddleware);

// Endpoint Audit Logs (dijaga oleh PEP, hanya role admin)
app.get('/audit-logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100
    `).all();
    res.json({
      count: logs.length,
      logs
    });
  } catch (err) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

// Proxy ke Backend Services (:3001 Service Nilai, :3002 Service Transkrip)
setupProxies(app);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[GATEWAY ERROR]:', err);
  res.status(500).json({
    error: 'Internal Gateway Error',
    message: err.message
  });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(` 🛡️  API Gateway (PEP) aktif di http://localhost:${config.port}`);
    console.log(`    Kebijakan Jam Akses: ${config.accessHours.start}:00 - ${config.accessHours.end}:00`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
