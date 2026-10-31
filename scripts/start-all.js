const { spawn } = require('child_process');
const path = require('path');

console.log('=======================================================');
console.log('  🚀 MENJALANKAN SISTEM NILAI ZERO TRUST (3 SERVICES)  ');
console.log('=======================================================');

const services = [
  { name: 'GATEWAY (:3000)', file: 'gateway/server.js' },
  { name: 'SERVICE-NILAI (:3001)', file: 'service-nilai/server.js' },
  { name: 'SERVICE-TRANSKRIP (:3002)', file: 'service-transkrip/server.js' }
];

const processes = [];

services.forEach(({ name, file }) => {
  const filePath = path.resolve(__dirname, '..', file);
  const child = spawn('node', [filePath], {
    stdio: ['inherit', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[${name} ERR] ${data}`);
  });

  child.on('close', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  processes.push(child);
});

// Tangani penutupan proses secara rapi
process.on('SIGINT', () => {
  console.log('\nMematikan seluruh service Zero Trust...');
  processes.forEach((child) => child.kill('SIGINT'));
  process.exit();
});

process.on('SIGTERM', () => {
  processes.forEach((child) => child.kill('SIGTERM'));
  process.exit();
});
