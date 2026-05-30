# CC PCBA 订单网站 — 技术架构方案

> 最后更新：2026-05-27
> 状态：✅ 定稿（第三版）

---

## 一、最终架构决策

### 核心原则：VPS 只跑业务逻辑，数据完全剥离到 Cloudflare

```
客户浏览器
    ↓
Cloudflare CDN（域名 / SSL / DDoS防护 / 全球加速）
    ↓
VPS · 美国（Nginx 反向代理）
    ↓
Node.js + Express（纯业务逻辑，完全无状态）
    ↓              ↓
Cloudflare D1   Cloudflare R2
（数据库）      （文件存储）
美国区域        美国区域
```

### 架构优势
- VPS 挂了/换机器 → 数据完全安全，重新部署代码即可恢复
- 所有数据在 Cloudflare，自动冗余，无需手动备份
- Cloudflare CDN 在前面，隐藏 VPS 真实 IP，防 DDoS
- 静态资源全球 CDN 加速，动态 API 走美国 VPS
- VPS 到 D1/R2 延迟约 5-15ms（同在美国），几乎无感知
- 成本：VPS 之外全部免费

---

## 二、基础设施规划

| 组件 | 方案 | 区域 | 费用 |
|------|------|------|------|
| 应用服务器 | VPS（已有） | 美国 | 已有 |
| 反向代理 | Nginx | VPS 上 | 免费 |
| 进程管理 | PM2 | VPS 上 | 免费 |
| 数据库 | Cloudflare D1（SQLite） | 美国 | 永久免费 |
| 文件存储 | Cloudflare R2 | 美国 | 永久免费 |
| CDN / SSL | Cloudflare | 全球 | 永久免费 |
| 多站点支持 | Nginx 虚拟主机 | VPS 上 | 免费 |

### Cloudflare 免费额度（永久）
| 服务 | 免费额度 |
|------|----------|
| D1 存储 | 5GB |
| D1 读取 | 每天 500 万次 |
| D1 写入 | 每天 10 万次 |
| R2 存储 | 每月 10GB |
| R2 读取 | 每月 1000 万次 |
| R2 写入 | 每月 100 万次 |
| R2 出口流量 | 永久免费 |

---

## 三、VPS 多站点架构

```
Nginx（80/443端口）
├── ccpcba.yourdomain.com  → Node.js :3001 (CC PCBA)
├── site2.yourdomain.com   → Node.js :3002
├── site3.yourdomain.com   → Node.js :3003
└── ...
```

每个网站：
- 独立 Node.js 进程，PM2 管理
- 独立 D1 数据库（或共用，按需）
- 共用 Nginx + SSL

---

## 四、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前台 | HTML + CSS + JS | 极客绿黑风，纯静态 |
| 后台 | HTML + CSS + JS | 同风格，单页应用 |
| API | Node.js + Express | RESTful，完全无状态 |
| 认证 | JWT + bcrypt + OAuth2 | 客户/管理员双轨 |
| 数据库 | Cloudflare D1（SQLite） | 替代原 PostgreSQL |
| 文件存储 | Cloudflare R2 | 替代本地 multer 存储 |
| CDN | Cloudflare | 免费套餐 |
| 反向代理 | Nginx | SSL终止 + 多站点 |
| 进程管理 | PM2 | 自动重启、日志管理 |
| 邮件服务 | SMTP / Resend | 后台可切换，密码加密存储 |
| 支付 | PayPal / Apple Pay / Google Pay | Phase 5 接入 |

---

## 五、数据库表设计（D1 / SQLite 语法）

### users（客户账号）
```sql
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT,
  name           TEXT NOT NULL DEFAULT '',
  company        TEXT,
  whatsapp       TEXT,
  customer_type  TEXT NOT NULL DEFAULT 'normal',
  note           TEXT,
  google_id      TEXT UNIQUE,
  github_id      TEXT UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verify_token   TEXT,
  reset_token    TEXT,
  reset_expires  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at  TEXT
);
```

### addresses（收货地址）
```sql
CREATE TABLE IF NOT EXISTS addresses (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL DEFAULT 'Home',
  recipient    TEXT NOT NULL,
  phone        TEXT,
  address_line TEXT NOT NULL,
  city         TEXT NOT NULL,
  country      TEXT NOT NULL DEFAULT 'US',
  is_default   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### orders（订单）
```sql
CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  order_no       TEXT UNIQUE NOT NULL,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_email    TEXT,
  mode           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  params         TEXT NOT NULL DEFAULT '{}',
  estimate       REAL,
  quoted_price   REAL,
  shipping_fee   REAL,
  total_paid     REAL,
  payment_method TEXT,
  payment_ref    TEXT,
  tracking_no    TEXT,
  notes          TEXT,
  admin_note     TEXT,
  files          TEXT NOT NULL DEFAULT '[]',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### settings（系统设置）
```sql
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### admin_users（运营账号）
```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Admin',
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
```

---

## 六、API 端点规划（不变）

### 公开接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings/public | 获取前台公开配置 |
| POST | /api/inquiry | 提交询价（含文件上传到R2） |
| POST | /api/order/lookup | 查询订单状态 |

### 客户接口（需客户 JWT）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/google | Google OAuth |
| POST | /api/auth/github | GitHub OAuth |
| GET | /api/auth/verify | 邮箱验证 |
| GET/PUT | /api/me | 个人信息 |
| PUT | /api/me/password | 修改密码 |
| GET | /api/me/orders | 历史订单 |
| GET/POST | /api/me/addresses | 地址管理 |
| PUT/DELETE | /api/me/addresses/:id | 地址操作 |

### 管理员接口（需管理员 JWT）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 管理员登录 |
| GET | /api/admin/stats | Dashboard统计 |
| GET | /api/admin/orders | 订单列表 |
| GET/PUT | /api/admin/orders/:id | 订单详情/更新 |
| POST | /api/admin/orders/:id/send-payment | 发付款链接 |
| GET | /api/admin/customers | 客户列表 |
| GET/PUT | /api/admin/customers/:id | 客户详情/更新 |
| GET/PUT | /api/admin/settings | 系统设置 |
| PUT | /api/admin/settings/encrypted/:key | 加密保存敏感配置 |
| POST | /api/admin/mail/test | 测试发信 |
| GET/POST | /api/admin/admins | 管理员账号 |
| PUT | /api/admin/admins/:id/password | 改密码 |

---

## 七、文件存储流程（R2）

```
客户上传文件
    ↓
Node.js 接收（multer 内存缓冲）
    ↓
上传到 Cloudflare R2
路径：orders/{order_no}/{filename}
    ↓
数据库存储 R2 文件路径
    ↓
后台下载时生成 R2 签名 URL（有效期1小时）
```

---

## 八、部署步骤

### 第一步：Cloudflare 配置
1. 创建 D1 数据库（美国区域）
2. 创建 R2 存储桶（美国区域）
3. 生成 D1 API Token 和 R2 API Token
4. 执行建表 SQL

### 第二步：VPS 环境配置
1. 安装 Node.js 18+
2. 安装 Nginx
3. 安装 PM2
4. 配置 Nginx 多站点
5. 配置 SSL（Let's Encrypt）

### 第三步：代码改造
1. 数据库驱动：pg → Cloudflare D1 HTTP API
2. 文件存储：multer 本地 → R2（aws-sdk/client-s3）
3. 更新环境变量

### 第四步：上线
1. 上传代码到 VPS
2. PM2 启动服务
3. 域名 DNS 指向 Cloudflare
4. 测试全流程

---

## 九、安全策略

- JWT secret 存环境变量，不进代码
- 敏感配置（邮件密码/API Key）AES-256-GCM 加密存数据库
- VPS 只开放 80/443/SSH 端口
- MySQL 不对外暴露（注：数据库已迁移至 D1，无 MySQL）
- Cloudflare 在前面挡 DDoS 和爬虫
- R2 文件通过签名 URL 访问，不公开直链
- OAuth client secret 只存环境变量

---

## 十、成本预估（月）

| 项目 | 费用 |
|------|------|
| VPS（已有） | 已有 |
| Cloudflare D1 | 永久免费 |
| Cloudflare R2 | 永久免费 |
| Cloudflare CDN/SSL | 永久免费 |
| **合计新增** | **$0** |
