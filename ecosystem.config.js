/**
 * PM2 Ecosystem 配置
 * 
 * 包含：
 *   - app       主服务（server.js）
 *   - backup-d1 每天 02:00 自动备份 D1 到 R2
 *
 * 启动方式：
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup   # 开机自启
 */

module.exports = {
  apps: [
    // ── 主服务 ──────────────────────────────────────────────────────────────
    {
      name: 'pcbaforge',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/app-error.log',
      out_file:   'logs/app-out.log',
      time: true,
    },

    // ── D1 定时备份 ─────────────────────────────────────────────────────────
    {
      name: 'backup-d1',
      script: 'scripts/backup-d1.js',
      // cron_restart：每天 UTC 02:00（北京时间 10:00）触发一次
      cron_restart: '0 2 * * *',
      // 作为定时任务运行：启动后执行一次，然后进入等待
      autorestart: false,
      watch: false,
      error_file: 'logs/backup-error.log',
      out_file:   'logs/backup-out.log',
      time: true,
    },
  ],
};
