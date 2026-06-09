const os = require('os');
const cluster = require('cluster');

const WORKERS = Math.min(
  parseInt(process.env.CLUSTER_WORKERS, 10) || os.cpus().length,
  8
);

if (cluster.isPrimary) {
  console.log(`🔄 Master ${process.pid} starting ${WORKERS} workers...`);

  for (let i = 0; i < WORKERS; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`⚠ Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`);
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Master received SIGTERM. Shutting down workers...');
    for (const id of Object.keys(cluster.workers)) {
      cluster.workers[id].kill();
    }
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🛑 Master received SIGINT. Shutting down workers...');
    for (const id of Object.keys(cluster.workers)) {
      cluster.workers[id].kill();
    }
    process.exit(0);
  });
} else {
  require('./index.js');
}
