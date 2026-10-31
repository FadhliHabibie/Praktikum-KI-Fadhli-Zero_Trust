const express = require('express');
const config = require('./config');
const { verifyGateway } = require('./middleware/verifyGateway');
const transkripRoutes = require('./routes/transkripRoutes');

const app = express();

app.use(express.json());

// Log incoming request to Service Transkrip
app.use((req, res, next) => {
  console.log(`[SERVICE TRANSKRIP :${config.port}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    component: 'Service Transkrip',
    port: config.port
  });
});

// Middleware Verifikasi Gateway (wajib X-Gateway-Secret dan valid JWT)
// Menjamin Zero Trust: Assume Breach & Never Trust, Always Verify
app.use(verifyGateway);

// Routes
app.use('/', transkripRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVICE TRANSKRIP ERROR]:', err);
  res.status(500).json({
    error: 'Internal Service Error',
    message: err.message
  });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(` 📜 Service Transkrip aktif di http://localhost:${config.port}`);
    console.log(`    Wajib Header: X-Gateway-Secret & Bearer JWT`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
