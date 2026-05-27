# PCBAForge 安全手册

> 最后更新：2026-05-27  
> 适用范围：pcbaforge.com · VPS (Contabo, Ubuntu 22.04) · Cloudflare

---

## 1. 服务器基础安全

### SSH 配置
| 项目 | 配置 | 说明 |
|------|------|------|
| SSH 端口 | 26917 | 非标准端口，避免扫描 |
| 密码登录 | 禁用 | `PasswordAuthentication no` |
| Root 登录 | 禁用 | `PermitRootLogin no` |
| 认证方式 | 密钥认证 | 仅允许 SSH Key 登录 |

### UFW 防火墙规则
```
80/tcp    ALLOW   HTTP
443/tcp   ALLOW   HTTPS
26917/tcp ALLOW   SSH
22        DENY    旧 SSH 端口
3001      DENY    Node.js 直接访问
3306      DENY    MySQL
6379      DENY    Redis
53        DENY    DNS
```

---

## 2. Nginx 安全配置

### 安全响应头
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
server_tokens off;
```

### 限流规则
| 路径 | 限制 | 突发 | 用途 |
|------|------|------|------|
| `/api/admin/login` | 5次/分钟 | 3次 | 防暴力破解后台 |
| `/api/auth/login` | 5次/分钟 | 3次 | 防暴力破解用户 |
| `/api/*` | 30次/分钟 | 10次 | 防 API 滥用 |
| `/` | 60次/分钟 | 20次 | 防爬虫 |

配置文件：`/etc/nginx/conf.d/rate-limit.conf`

---

## 3. Cloudflare 安全配置

| 功能 | 状态 | 说明 |
|------|------|------|
| SSL/TLS 模式 | Full (Strict) | 端到端加密 |
| Bot Fight Mode | ✅ 开启 | 防机器人 |
| WAF 托管规则 | ❌ 需 Pro 版 | 暂未启用 |
| Rate Limiting | ❌ 需 Pro 版 | 已用 Nginx 替代 |
| Turnstile 人机验证 | ✅ 已接入 | 后台登录已接入 |

### Turnstile 配置
- Site Key: `0x4AAAAAADXN55PgWWw3SGxw`
- 已接入页面：后台登录（`/admin`）
- 待接入：用户注册、询价表单

---

## 4. 应用层安全

### 认证与授权
- 管理员 JWT：`JWT_ADMIN_SECRET`（12小时有效）
- 用户 JWT：`JWT_SECRET`（7天有效）
- 密码：bcrypt 加密，cost factor 12
- 敏感配置：AES-256-GCM 加密存储（SMTP密码、API Key）

### 人机验证
- Cloudflare Turnstile 接入后台登录
- 后端验证 `/api/admin/login`、`/api/auth/login`、`/api/auth/register`

### 文件上传
- 允许类型：`.zip .rar .gerber .gbr .drl .xls .xlsx .csv .txt .pdf`
- 大小限制：50MB
- 存储：VPS 本地（待迁移至 R2）

---

## 5. 环境变量清单

| 变量 | 用途 | 存储位置 |
|------|------|----------|
| `JWT_SECRET` | 用户 JWT 签名 | VPS `.env` |
| `JWT_ADMIN_SECRET` | 管理员 JWT 签名 | VPS `.env` |
| `CLOUDFLARE_ACCOUNT_ID` | CF 账户 ID | VPS `.env` |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 数据库 ID | VPS `.env` |
| `CLOUDFLARE_API_TOKEN` | CF API Token | VPS `.env` |
| `TURNSTILE_SECRET` | Turnstile 验证密钥 | VPS `.env` |
| `SETTINGS_ENCRYPT_KEY` | AES 加密主密钥 | VPS `.env`（可选）|

---

## 6. 证书与域名

| 域名 | 证书 | 到期 | 自动续期 |
|------|------|------|----------|
| pcbaforge.com | Let's Encrypt | 90天 | Certbot 自动 |
| mrocioa.com | Let's Encrypt | 90天 | Certbot 自动 |
| diyinai.com | Let's Encrypt | 90天 | Certbot 自动 |

证书路径：`/etc/letsencrypt/live/pcbaforge.com/`

---

## 7. 待办安全任务

| 任务 | 优先级 | 说明 |
|------|--------|------|
| Turnstile 接入用户注册/登录 | 🔴 高 | quote.html + account.html |
| Turnstile 接入询价表单 | 🔴 高 | quote.html |
| 文件上传迁移至 R2 | 🟡 中 | 防 VPS 重启丢文件 |
| PM2 开机自启 | 🟡 中 | VPS 重启后自动恢复 |
| D1 数据定期备份 | 🟡 中 | 防数据丢失 |
| Cloudflare Pro WAF | 🟢 低 | 有收入后升级 |
| VPS 定期安全更新 | 🟢 低 | `apt upgrade` 定期执行 |

---

## 8. 紧急响应

### 发现异常访问
```bash
# 查看 Nginx 访问日志
tail -f /var/log/nginx/access.log

# 封禁某个 IP
sudo ufw deny from <IP> to any

# 查看当前连接
ss -tnp | grep 443
```

### 服务崩溃恢复
```bash
pm2 restart ccpcba
pm2 logs ccpcba --lines 50
```

### 证书续期
```bash
sudo certbot renew --dry-run  # 测试
sudo certbot renew            # 正式续期
sudo systemctl reload nginx
```

---

*安全无小事，定期检查，及时更新。*
