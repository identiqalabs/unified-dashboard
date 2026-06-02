module.exports = {
  apps: [
    {
      name: "iq-nms-api",
      script: "./server.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
