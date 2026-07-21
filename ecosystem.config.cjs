// pm2 process config — keeps AutoDoc PCR running in the background and
// restarts it automatically if it crashes or the machine reboots.
//
// Usage:
//   npm install -g pm2
//   pm2 start ecosystem.config.cjs
//   pm2 save            # remember this process list
//   pm2 startup         # (one-time) print the command to auto-start pm2 on boot
//
// See README.md for the full walkthrough.
module.exports = {
  apps: [
    {
      name: 'autodoc-pcr',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
