# D1 数据备份指南

> 任务 7.20：D1 数据定期备份到 R2

## 架构

```
D1（所有表）
  └─ 每天 02:00 UTC（北京 10:00）
      └─ JSON 快照 → R2 backups/d1/YYYY-MM-DD/backup_*.json
                            └─ 自动删除 30 天前的旧备份
```

## 需要在 .env 增加的变量

以下变量已在 R2 文件上传功能中使用，无需重复添加：

```dotenv
# 已有（R2 文件存储）
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=pcbaforge-files
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# 可选（默认 30 天）
BACKUP_RETAIN_DAYS=30
```

## 部署步骤

### 1. 上传新文件到 VPS

```bash
# 方式A：git pull（推荐）
cd /home/pcbaforge
git pull origin main

# 方式B：手动 SCP
scp scripts/backup-d1.js   user@vps:/home/pcbaforge/scripts/
scp ecosystem.config.js    user@vps:/home/pcbaforge/
```

### 2. 切换到 PM2 ecosystem 模式

```bash
cd /home/pcbaforge

# 停止旧的 PM2 进程（如果之前用 pm2 start server.js 启动的）
pm2 delete pcbaforge   # 或者 pm2 delete all

# 用 ecosystem 配置启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # 如果还没配置开机自启
```

### 3. 手动触发一次测试

```bash
node scripts/backup-d1.js

# 或者通过 PM2
pm2 restart backup-d1
```

### 4. 验证备份结果

```bash
# 查看备份日志
tail -f logs/backup.log

# 预期输出：
# [2026-05-29T10:00:00.000Z] === 开始 D1 备份 ===
# [2026-05-29T10:00:01.000Z]   ✅ users: 12 条
# [2026-05-29T10:00:01.500Z]   ✅ orders: 34 条
# ...
# [2026-05-29T10:00:03.000Z] ✅ 已上传备份：backups/d1/2026-05-29/backup_2026-05-29_10-00-00.json (18.3 KB)
# [2026-05-29T10:00:03.200Z] 🧹 无需清理（保留天数：30 天）
# [2026-05-29T10:00:03.200Z] === 备份完成 ===
```

### 5. 在 Cloudflare R2 控制台确认

登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 → `pcbaforge-files` bucket → 浏览 `backups/d1/` 目录。

## 备份文件格式

```json
{
  "backup_time": "2026-05-29T10:00:00.000Z",
  "tables": {
    "users":       [ { "id": "...", "email": "..." } ],
    "admin_users": [ { ... } ],
    "orders":      [ { ... } ],
    "settings":    [ { ... } ],
    "addresses":   [ { ... } ],
    "posts":       [ { ... } ]
  }
}
```

## 恢复数据（灾难恢复）

1. 从 R2 下载目标备份文件
2. 解析 JSON 获取各表数据
3. 用 D1 API 批量 INSERT 数据（或联系 Cloudflare 支持直接恢复 D1 快照）

> ⚠️ 恢复前务必先确认目标 D1 数据库状态，建议先备份当前数据。

## PM2 常用命令

```bash
pm2 list                    # 查看所有进程状态
pm2 logs backup-d1          # 查看备份进程日志
pm2 restart backup-d1       # 手动触发一次备份
pm2 show backup-d1          # 查看详细信息（含下次执行时间）
```
