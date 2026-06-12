# PCBAForge 运维手册 (Operations Manual)

> 本文档记录日常运维操作。任何人接手都应先读本文档。
> 服务器：VPS（Nginx + Node.js + PM2）· 数据库：Cloudflare D1 · 存储：Cloudflare R2

---

## 0. 关键信息速查

| 项目 | 值 |
|------|-----|
| 项目目录 | `/var/www/pcbaforge` |
| PM2 进程名 | `ccpcba` |
| 域名 | https://pcbaforge.com |
| 后台 | https://pcbaforge.com/admin |
| 环境变量文件 | `/var/www/pcbaforge/.env`（含所有密钥，勿外泄、勿提交 Git） |
| Node 路径 | `/usr/bin/node` |
| 备份日志 | `/var/www/pcbaforge/backup.log` |

> 所有密码 / API Key / Token 都在 `.env` 里，不记录在本文档。

---

## 1. 部署 / 更新代码

代码改动推到 GitHub 后，在 VPS 上拉取并重启：

```bash
cd /var/www/pcbaforge
git pull --no-rebase --no-edit origin main
pm2 restart ccpcba
```

如果改了 `package.json`（新增依赖），先装依赖：

```bash
npm install
pm2 restart ccpcba
```

查看服务状态 / 日志：

```bash
pm2 status            # 看进程是否 online
pm2 logs ccpcba       # 看实时日志（Ctrl+C 退出）
pm2 logs ccpcba --lines 100   # 看最近 100 行
```

---

## 2. 数据备份（自动）

**机制：** 每天凌晨 3:00，cron 自动运行 `backup.js`，把 D1 全部数据导出为 JSON，上传到 R2 的 `backups/` 目录，并删除 30 天前的旧备份。备份完成发邮件通知（成功/失败）到后台设置的 contact_email。

**涉及文件：** `backup.js`
**备份内容：** users, admin_users, orders, settings, addresses, posts 六张表
**保留策略：** 30 天
**存储位置：** R2 bucket `pcbaforge-files` 的 `backups/` 目录

### 查看 cron 任务
```bash
crontab -l
```
应包含：
```
0 3 * * * cd /var/www/pcbaforge && /usr/bin/node backup.js >> /var/www/pcbaforge/backup.log 2>&1
```

### 手动立即备份一次
```bash
cd /var/www/pcbaforge
node backup.js
```

### 查看备份日志
```bash
tail -n 50 /var/www/pcbaforge/backup.log
```

---

## 3. 数据恢复（手动）⚠️

**何时用：** 数据被误删 / 误改 / 数据库损坏，需要从备份找回。

**涉及文件：** `restore.js`
**恢复策略：** INSERT OR REPLACE —— 备份里的行按主键写回/覆盖；当前库里多出来的行保留不删。
**安全机制：** 恢复前会自动把当前数据库存一份「恢复前快照」(`pre-restore-*.json`) 到 R2，万一恢复错了可以再恢复这个快照来反悔。

### 恢复三步走

**第一步：列出所有可用备份**
```bash
cd /var/www/pcbaforge
node restore.js --list
```
会列出 R2 里所有备份文件（按时间新→旧），复制你要恢复的那个文件的 key（如 `backups/backup-2026-05-29T03-00-00-000Z.json`）。

**第二步：预览备份内容（只读，不写库）**
```bash
node restore.js --file backups/backup-2026-05-29T03-00-00-000Z.json --dry-run
```
确认这个备份里各表的行数符合预期。

**第三步：确认无误后，真正恢复**
```bash
node restore.js --file backups/backup-2026-05-29T03-00-00-000Z.json --confirm
```
脚本会先存恢复前快照，再把数据写回。完成后会打印快照文件名——记下它，万一需要反悔。

### 如果恢复错了，想反悔
用上面打印出的 `pre-restore-XXXX.json` 当作备份文件，再跑一次恢复即可回到恢复前的状态：
```bash
node restore.js --file backups/pre-restore-XXXX.json --confirm
```

---

## 4. 常用运维命令

```bash
# PM2
pm2 status                    # 进程状态
pm2 restart ccpcba            # 重启
pm2 stop ccpcba               # 停止
pm2 logs ccpcba               # 实时日志

# Nginx
sudo nginx -t                 # 测试配置语法
sudo systemctl reload nginx   # 重载配置
sudo systemctl status nginx   # 状态

# 磁盘 / 资源
df -h                         # 磁盘空间
free -m                       # 内存
top                           # 实时进程（q 退出）

# 查看 Node 路径
which node
```

---

## 5. 注意事项

- `.env` 文件**绝不能提交到 Git**，里面是所有密钥。确认 `.gitignore` 已包含 `.env`。
- 恢复操作（restore.js）有风险，务必先 `--dry-run` 预览再 `--confirm`。
- 改 nano 文件时若在 Mac 远程终端，`Ctrl+O` 可能弹出 macOS 文件框，改用 `Ctrl+X → Y → 回车` 保存退出。
- D1 是 Cloudflare 托管，备份存在 R2（同账号不同服务）。若要更高安全级别，可定期把 R2 备份再下载到本地异地保存。

---

## 6. 维护记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-06-12 | 修复 Google 收录规范化问题 | 在 VPS 线上热修复后提交 GitHub：添加页面 canonical、设置 `/index.html` 301 到 `/`、清理站内 `index.html#...` 链接；PM2 重启 `ccpcba` 并验证线上返回正常。 |
| 2026-05-29 | 建立备份+恢复机制 | backup.js / restore.js / cron 每日 3:00 / 保留30天 |
