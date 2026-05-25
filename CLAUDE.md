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
- `index.html` — 后台管理页，订单管理，报价参数管理

**③ 本地同步工具**（未来开发）
- `sync-tool/` — Mac 本地运行，Playwright 抓取供应商状态

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
├── CLAUDE.md              ← 你正在读的文件
├── server.js              ← Express 后端主文件
├── database.js            ← SQLite 数据库初始化
├── .env                   ← 环境变量（不提交git）
├── .gitignore
├── package.json
├── public/                ← 客户前台（静态文件）
│   ├── index.html
│   ├── quote.html
│   └── track.html
├── admin/                 ← 运营后台
│   └── index.html
└── uploads/               ← 客户上传文件（不提交git）
```

---

## API 接口

### 客户端
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/inquiry` | 提交询价，支持文件上传 |
| GET | `/api/track/:order_no` | 查询订单状态 |

### 后台（需要 Header: `x-admin-token: ccpcba_admin_2026`）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 仪表盘统计数据 |
| GET | `/api/admin/inquiries` | 订单列表 |
| GET | `/api/admin/inquiries/:id` | 订单详情 |
| PATCH | `/api/admin/inquiries/:id` | 更新订单（状态/报价/备注/供应商） |
| GET | `/api/admin/pricing` | 报价参数列表 |
| PATCH | `/api/admin/pricing/:id` | 更新报价参数 |

---

## 数据库表

### inquiries（订单表）
| 字段 | 说明 |
|------|------|
| order_no | 订单号，格式 CC + 时间戳 |
| name / email / whatsapp | 客户信息 |
| service_type | PCB Only / SMT Assembly / Through-Hole / Turnkey PCBA |
| quantity | 数量 |
| status | pending → quoted → paid → production → shipped → completed |
| quote_amount | 正式报价金额 |
| admin_notes | 给客户看的备注 |
| supplier | 发给哪个供应商 |
| supplier_order_no | 供应商那边的订单号 |
| tracking_no | 物流单号 |
| files | 上传文件路径，逗号分隔 |

### pricing_config（报价参数表）
| 字段 | 说明 |
|------|------|
| category | pcb / smt / dip / ship |
| key | 参数键名 |
| label | 显示名称 |
| value | 当前值 |
| unit | 单位（USD等） |

---

## 设计规范

- **配色**：黑底绿字，`--bg:#0A0F0A`，`--green:#00FF41`
- **字体**：标题用 Orbitron，代码/标签用 Share Tech Mono，正文用 DM Sans
- **风格**：极客 PCB 电路板风，参考嘉立创/JLC 大厂风格
- **语言**：前台英文，后台中文

---

## 本地开发

```bash
# 启动服务器
node server.js

# 访问地址
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
- 每个文件修改后单独 commit，不要批量 push
- 前台页面风格必须保持一致（绿黑极客风）
- 后台 admin token 目前是简单验证，上线前要加强
- 文件上传目前存本地，上线 VPS 后迁移到 Cloudflare R2
