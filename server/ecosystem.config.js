module.exports = {
  apps: [{
    name: 'pdfforge-server',
    script: './index.js',
    instances: process.env.CLUSTER_WORKERS || 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    restart_delay: 5000,
    kill_timeout: 10000,
  }],
};
