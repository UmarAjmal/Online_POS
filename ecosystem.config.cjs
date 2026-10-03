/** PM2 cluster — 2 Node workers for concurrent requests */
module.exports = {
  apps: [
    {
      name: "ar-group",
      script: "./server.js",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "768M",
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
