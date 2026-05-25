# CC PCBA — Claude Project Instructions

> 这个文件是给 Claude Code 读的项目说明，每次启动自动加载。

---

## 项目定位

面向海外工程师与采购商的 **PCBA 一站式接单网站**，支持：
- PCB 制板
- SMT 贴片
- 插件 / DIP 焊接
- Turnkey 全工序交付

---

## 系统架构

### 三个组成部分

**① 客户前台**（`public/`）
- `index.html` — 主页，报价计算器（四模式），品牌展示
- `quote.html` — 询价下单页，文件上传，提交后端
- `track.html` — 订单追踪页，输入订单号查询状态

**② 运营后台**（`admin/`）
- `index.html` — 后台管理页，四大模块（见下方详细说明）

**③ 本地同步工具**（未来开发）
- `sync-tool/` — Mac 本地运行，Playwright 抓取供应商状态

---

## 后台四大模块（admin/index.html）

### 模块一：订单管理
- 仪表盘：各状态订单统计，今日新询价数
- 订单列表：分页、按状态筛选
- 订单详情弹窗：
  - 查看客户信息、需求参数、上传文件（可下载）
  - 更新订单状态（pending→quoted→paid→production→shipped→completed）
  - 填写正式报价金额
  - 填写给客户看的备注（admin_notes，客户在追踪页可见）
  - 填写供应商名称和供应商订单号
  - 填写物流单号

### 模块二：报价参数管理
- 列出所有报价参数（PCB / SMT / DIP / 运费）
- 每条参数可直接编辑数值
- 保存后前台报价计算器即时生效
- 调用 `/api/admin/pricing` 接口

### 模块三：网站内容管理
- 首页 Hero 标题和副标题
- 服务介绍四宫格（标题、描述、标签）
- 工艺能力参数表内容
- 以上内容存入 `site_config` 表，前台通过 `/api/config` 接口读取

### 模块四：系统设置
- 公司名称（前台 nav logo 文字）
- WhatsApp 号码（前台所有 WA 链接使用）
- 联系邮箱
- 基础 SEO：每个页面的 title 和 meta description
- 管理员 Token 修改（改完需重启服务器）
- 以上内容存入 `site_config` 表

---

## 需要新增的数据库表

### site_config（网站配置表）
```sql
CREATE TABLE IF NOT EXISTS site_config (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  label      TEXT,
  updated_at TEXT
);
```

默认数据：
| key | label | 默认值 |
|-----|-------|--------|
| company_name | 公司名称 | CC PCBA |
| whatsapp_number | WhatsApp号码 | |
| contact_email | 联系邮箱 | |
| seo_home_title | 首页Title | CC PCBA — PCB & SMT Assembly |
| seo_home_desc | 首页Description | One-stop PCBA service... |
| seo_quote_title | 询价页Title | Submit Inquiry — CC PCBA |
| seo_track_title | 追踪页Title | Track Order — CC PCBA |
| hero_title | Hero主标题 | Your PCBA Partner |
| hero_subtitle | Hero副标题 | From Prototype to Production |

---

## 需要新增的 API 接口

```
GET  /api/config              获取所有 site_config（公开，前台用）
GET  /api/admin/config        获取所有配置（后台用，需token）
PATCH /api/admin/config/:key  更新单条配置（需token）
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express |
| 数据库 | SQLite（本地）→ PostgreSQL（VPS） |
| 文件存储 | 本地 uploads/（→ Cloudflare R2） |
| 前端 | 纯 HTML + CSS + JS，无框架 |
| 风格 | 极客绿黑风，字体 Orbitron + Share Tech Mono + DM Sans |

---

## 项目文件结构

```
CC-PCBA/
├── CLAUDE.md
├── server.js
├── database.js
├── .env
├── .gitignore
├── package.json
├── public/
│   ├── index.html
│   ├── quote.html
│   └── track.html
├── admin/
│   └── index.html
└── uploads/
```

---

## API 接口完整列表

### 客户端（公开）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/inquiry` | 提交询价，支持文件上传 |
| GET | `/api/track/:order_no` | 查询订单状态 |
| GET | `/api/config` | 获取网站配置（公司名/WA号码等） |

### 后台（需要 Header: `x-admin-token: ccpcba_admin_2026`）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 仪表盘统计 |
| GET | `/api/admin/inquiries` | 订单列表 |
| GET | `/api/admin/inquiries/:id` | 订单详情 |
| PATCH | `/api/admin/inquiries/:id` | 更新订单 |
| GET | `/api/admin/pricing` | 报价参数列表 |
| PATCH | `/api/admin/pricing/:id` | 更新报价参数 |
| GET | `/api/admin/config` | 获取网站配置 |
| PATCH | `/api/admin/config/:key` | 更新网站配置 |

---

## 数据库表

### inquiries（订单表）
| 字段 | 说明 |
|------|------|
| order_no | CC + 时间戳 |
| name / email / whatsapp | 客户信息 |
| service_type | PCB Only / SMT Assembly / Through-Hole / Turnkey PCBA |
| quantity | 数量 |
| status | pending→quoted→paid→production→shipped→completed |
| quote_amount | 正式报价金额 |
| admin_notes | 给客户看的备注 |
| supplier | 供应商名称 |
| supplier_order_no | 供应商订单号 |
| tracking_no | 物流单号 |
| files | 上传文件路径，逗号分隔 |

### pricing_config（报价参数表）
| 字段 | 说明 |
|------|------|
| category | pcb / smt / dip / ship |
| key | 参数键名 |
| label | 显示名称 |
| value | 当前值 |
| unit | 单位 |

### site_config（网站配置表）
| 字段 | 说明 |
|------|------|
| key | 配置键名（唯一） |
| value | 配置值 |
| label | 后台显示名称 |

---

## 设计规范

- **配色**：黑底绿字，`--bg:#0A0F0A`，`--green:#00FF41`
- **字体**：标题用 Orbitron，代码/标签用 Share Tech Mono，正文用 DM Sans
- **风格**：极客 PCB 电路板风
- **语言**：前台英文，后台中文

---

## 本地开发

```bash
node server.js
# 前台：http://localhost:3001
# 后台：http://localhost:3001/admin
```

---

## 环境变量（.env）

```
PORT=3001
ADMIN_TOKEN=ccpcba_admin_2026
DB_PATH=./cc_pcba.db
WHATSAPP_NUMBER=你的WhatsApp号码
CONTACT_EMAIL=你的邮箱
```

---

## 注意事项

- `.env` 和 `uploads/` 不提交 git
- 每个文件单独 commit，不要批量 push
- 前台风格必须保持一致（绿黑极客风）
- 后台 token 上线前要加强验证
- 文件上传目前存本地，上线后迁移到 Cloudflare R2
