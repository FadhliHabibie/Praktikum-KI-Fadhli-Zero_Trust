const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const config = require('../config');

function createServiceProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    // Pertahankan path asli yang diminta klien tanpa dipotong oleh Express mount path
    pathRewrite: (path, req) => req.originalUrl,
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Tambahkan header rahasia gateway (Zero Trust - Assume Breach)
        proxyReq.setHeader('x-gateway-secret', config.gatewaySecret);

        // Teruskan header Authorization jika ada
        if (req.headers['authorization']) {
          proxyReq.setHeader('authorization', req.headers['authorization']);
        }

        // Teruskan header device jika ada
        if (req.headers['x-device-id']) {
          proxyReq.setHeader('x-device-id', req.headers['x-device-id']);
        }

        // Restream request body yang sudah diparse oleh express.json()
        fixRequestBody(proxyReq, req);
      },
      error: (err, req, res) => {
        console.error(`Proxy Error ke ${target}:`, err.message);
        if (!res.headersSent) {
          res.status(502).json({
            error: 'Bad Gateway',
            message: `Gagal meneruskan request ke service backend (${target}): ${err.message}`
          });
        }
      }
    }
  });
}

function setupProxies(app) {
  const nilaiProxy = createServiceProxy(config.services.nilaiUrl);
  const transkripProxy = createServiceProxy(config.services.transkripUrl);

  // Service Nilai menangani route /nilai dan /kelas
  app.use('/nilai', nilaiProxy);
  app.use('/kelas', nilaiProxy);

  // Service Transkrip menangani route /transkrip
  app.use('/transkrip', transkripProxy);
}

module.exports = {
  setupProxies
};
