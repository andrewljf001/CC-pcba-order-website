# CC PCBA 订单网站 — 技术架构方案

> 最后更新：2026-05-26
> 状态：✅ 定稿（第二版）

---

## 一、整体架构

```
┌─────────────────────────────────────────────────┐
│  客户浏览器                                       │
│  前台网站（HTML/CSS/JS）                          │
│  ├─ 首页 / 报价计算器                             │
│  ├─ 询价表单（quote.html）                        │
│  ├─ 订单追踪（track.html）                        │
│  └─ 客户中心（account.html）                      │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────┐
│  VPS（新加坡，4GB内存）                            │
│  ├─ Nginx 反向代理                               │
│  ├─ 前台静态文件服务                              │
│  ├─ Node.js + Express API 服务                   │
│  ├─ 运营后台（admin.html，同域名 /admin）          │
│  └─ PostgreSQL（订单/报价/客户/用户数据）          │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐   ┌──────────▼──────────┐
│ Cloudflare R2  │   │  Cloudflare CDN      │
│ 客户上传文件    │   │  静态资源加速         │
│ Gerber/BOM等   │   │  全球访问加速         │
└────────────────┘   └─────────────────────┘

┌─────────────────────────────────────────────────┐
│  你的 Mac（本地）                                 │
│  ├─ 本地同步工具（Node.js + Playwright）          │
│  ├─ 供应商适配器（嘉立创 / 其他）                  │
│  ├─ 订单号映射表（本地存储）                       │
│  └─ 定时推送状态到 VPS API                        │
└─────────────────────────────────────────────────┘
```

---

## 二、VPS 配置

| 项目 | 规格 |
|------|------|
| 内存 | 4GB |
| CPU | 2核 |
| 系统盘 | 40GB SSD |
| 带宽 | 20Mbps |
| 位置 | 新加坡（覆盖欧美延迟可接受，亚洲最优） |
| 推荐服务商 | Hetzner（最性价比）/ DigitalOcean |
| 月费预估 | $8~10/月 |

---

## 三、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前台 | HTML + CSS + JS | 纯静态，极客绿黑风 |
| 后台 | HTML + CSS + JS（同风格） | 自建极客绿黑风运营后台 |
| API | Node.js + Express | RESTful API |
| 认证 | JWT + bcrypt + OAuth2 | 用户登录 / Google / GitHub |
| 数据库 | PostgreSQL | 订单、用户、系统设置 |
| 文件存储 | Cloudflare R2 | 零出口费，免费10GB |
| CDN | Cloudflare | 免费套餐 |
| 反向代理 | Nginx | SSL终止 + 静态文件服务 |
| 邮件服务 | Resend | 简单接入，有免费额度 |
| 支付 | PayPal API + PingPong B2B | |
| 本地工具 | Node.js + Playwright | Mac本地运行 |

---

## 四、数据库表设计

### 4.1 users（客户账号）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | VARCHAR | 唯一，登录用 |
| password_hash | VARCHAR | bcrypt，OAuth用户可为空 |
| name | VARCHAR | 显示名 |
| company | VARCHAR | 公司名（可选） |
| whatsapp | VARCHAR | WhatsApp 号码 |
| customer_type | ENUM | normal / vip / blacklist |
| note | TEXT | 运营备注（仅后台可见） |
| google_id | VARCHAR | Google OAuth 绑定 |
| github_id | VARCHAR | GitHub OAuth 绑定 |
| email_verified | BOOLEAN | 邮箱是否已验证 |
| created_at | TIMESTAMP | 注册时间 |
| last_login_at | TIMESTAMP | 最后登录时间 |

### 4.2 addresses（收货地址）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联 users |
| label | VARCHAR | 地址标签（Home / Office 等） |
| recipient | VARCHAR | 收件人 |
| phone | VARCHAR | 联系电话 |
| address_line | TEXT | 详细地址 |
| city | VARCHAR | 城市 |
| country | VARCHAR | 国家 |
| is_default | BOOLEAN | 是否默认地址 |

### 4.3 orders（订单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_no | VARCHAR | 展示用订单号（CC + 时间戳） |
| user_id | UUID | 关联 users（可为空，未注册客户） |
| guest_email | VARCHAR | 未登录客户邮箱 |
| mode | ENUM | pcb / smt / turnkey |
| status | ENUM | pending / quoted / confirmed / paid / production / shipped / completed / cancelled |
| params | JSONB | 订单参数（PCB/SMT 具体规格） |
| estimate | DECIMAL | 首页计算器估算价 |
| quoted_price | DECIMAL | 工程师确认报价 |
| shipping_fee | DECIMAL | 运费（生产后填写） |
| total_paid | DECIMAL | 实际付款总额 |
| payment_method | ENUM | paypal / pingpong |
| payment_ref | VARCHAR | 支付流水号 |
| tracking_no | VARCHAR | 物流单号 |
| notes | TEXT | 客户备注 |
| admin_note | TEXT | 运营备注（仅后台） |
| files | JSONB | 上传文件列表（R2 路径） |
| created_at | TIMESTAMP | 询价时间 |
| updated_at | TIMESTAMP | 最后更新时间 |

### 4.4 settings（系统设置）

| 字段 | 类型 | 说明 |
|------|------|------|
| key | VARCHAR | 唯一键 |
| value | TEXT | 值 |
| description | VARCHAR | 说明 |

> 通过 settings 表管理的配置项：
> - `whatsapp_number` — 前台 WA 按钮号码
> - `shipping_address` — 客供料收件地址
> - `pcb_tier1_price` / `pcb_tier2_price` / `pcb_tier3_price` — PCB 报价参数
> - `smt_single_price` / `smt_double_price` — SMT 报价参数
> - `google_oauth_enabled` / `github_oauth_enabled` — OAuth 开关

### 4.5 admin_users（运营账号）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | VARCHAR | 登录邮箱 |
| password_hash | VARCHAR | bcrypt |
| name | VARCHAR | 显示名 |
| role | ENUM | superadmin / admin |
| created_at | TIMESTAMP | |

---

## 五、用户认证体系

### 5.1 登录方式

| 方式 | 说明 |
|------|------|
| 邮箱 + 密码 | 标准注册登录 |
| Google OAuth | 一键登录，后台可开关 |
| GitHub OAuth | 一键登录，后台可开关 |

### 5.2 认证流程

```
注册：邮箱 + 密码 → 发送验证邮件 → 验证后激活账号
登录：邮箱/OAuth → 验证 → 返回 JWT Token（7天有效）
Token 存储：localStorage，每次请求带 Authorization: Bearer <token>
```

### 5.3 OAuth 绑定规则

- 同邮箱自动合并账号（Google / GitHub 邮箱与已注册邮箱一致时）
- 已登录状态下可在账号设置页绑定 / 解绑 Google & GitHub
- 后台可强制解绑某客户的 OAuth

---

## 六、前台客户中心（account.html）

### 页面结构
```
account.html
├─ 登录 / 注册 Tab（未登录时显示）
│   ├─ 邮箱 + 密码登录
│   ├─ Google 登录按钮
│   └─ GitHub 登录按钮
└─ 个人中心（已登录时显示）
    ├─ 账号信息（姓名、邮箱、公司、WA号码）
    ├─ 收货地址管理（增删改查，设默认）
    ├─ 第三方绑定（绑定/解绑 Google / GitHub）
    └─ 历史订单列表
        ├─ 订单卡片（订单号 / 服务类型 / 状态 / 金额 / 日期）
        └─ 点击展开订单详情 + 付款入口（状态 Quoted 时）
```

---

## 七、运营后台（/admin）

### 7.1 UI 风格
- 与前台完全一致：极客绿黑科技风
- 同一套 CSS 变量（--bg / --green / --border 等）
- 左侧导航栏 + 右侧内容区布局

### 7.2 功能模块

```
/admin
├─ Dashboard        订单统计、待处理数量、近期收款
├─ Orders           订单管理
│   ├─ 订单列表（按状态筛选、搜索）
│   └─ 订单详情（查看参数、下载文件、填写报价、更新状态、发送付款链接）
├─ Customers        客户管理
│   ├─ 客户列表（邮箱/公司/类型/订单数/总金额）
│   ├─ 客户详情（资料 + 全部历史订单）
│   └─ 标记客户类型（Normal / VIP / Blacklist）+ 运营备注
├─ Payments         收款记录
│   ├─ 已收款列表
│   └─ 待补运费列表
├─ Settings         系统设置
│   ├─ WhatsApp 号码
│   ├─ 客供料收件地址
│   ├─ PCB / SMT 报价参数
│   └─ OAuth 开关（Google / GitHub 登录开关）
└─ Admins           管理员账号管理
```

---

## 八、API 端点规划

### 公开接口（无需登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/inquiry | 提交询价（支持附件上传） |
| GET | /api/order/:order_no | 查询订单状态（需邮箱验证） |
| GET | /api/settings/public | 获取前台公开配置（WA号码、收件地址等） |

### 客户接口（需客户 JWT）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| GET | /api/auth/google | Google OAuth |
| GET | /api/auth/github | GitHub OAuth |
| GET | /api/me | 获取个人信息 |
| PUT | /api/me | 更新个人信息 |
| GET | /api/me/orders | 历史订单列表 |
| GET | /api/me/addresses | 收货地址列表 |
| POST | /api/me/addresses | 新增地址 |
| PUT | /api/me/addresses/:id | 修改地址 |
| DELETE | /api/me/addresses/:id | 删除地址 |

### 运营后台接口（需管理员 JWT）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 管理员登录 |
| GET | /api/admin/orders | 订单列表 |
| GET | /api/admin/orders/:id | 订单详情 |
| PUT | /api/admin/orders/:id | 更新订单（状态/报价/物流） |
| POST | /api/admin/orders/:id/send-payment | 发送付款链接 |
| GET | /api/admin/customers | 客户列表 |
| GET | /api/admin/customers/:id | 客户详情 + 历史订单 |
| PUT | /api/admin/customers/:id | 更新客户信息/类型/备注 |
| GET | /api/admin/settings | 获取系统设置 |
| PUT | /api/admin/settings | 更新系统设置 |

---

## 九、订单状态流转

```
pending     客户提交询价，等待工程师审核
    ↓
quoted      工程师确认报价，系统发送付款链接给客户
    ↓
paid        客户付款完成（PayPal自动 / PingPong人工确认）
    ↓
production  进入生产（本地工具从供应商同步状态）
    ↓
shipped     已发货（运营填写物流单号，系统通知客户补付运费）
    ↓
completed   客户补付运费 + 确认收货
    ↓
cancelled   任意阶段可取消（运营操作）
```

---

## 十、本地同步工具架构

```
sync-tool/
├─ index.js              # 主入口，定时任务
├─ api.js                # 推送状态到网站的API客户端
├─ mapping.json          # 订单号映射表（本地持久化）
└─ adapters/
    ├─ base.js           # 适配器基类（统一接口）
    ├─ jlcpcb.js         # 嘉立创适配器（第一期）
    └─ [vendor].js       # 其他供应商（按需扩展）
```

---

## 十一、安全策略

- 客户密码 bcrypt hash，不存明文
- 供应商账号密码只存 Mac 本地，不上 VPS
- VPS 只开放 80 / 443 / SSH 端口
- 后台 /admin 路由需管理员 JWT，IP 白名单可选
- Cloudflare R2 文件通过签名 URL 访问，不公开直链
- OAuth client secret 只存服务器环境变量
- 数据库每日自动备份到异地（Backblaze B2）

---

## 十二、成本预估（月）

| 项目 | 费用 |
|------|------|
| VPS（Hetzner 4GB） | ~$8 |
| Cloudflare R2（初期10GB内） | 免费 |
| Cloudflare CDN | 免费 |
| Resend 邮件（初期100封/天内） | 免费 |
| 域名 | ~$1（年费分摊） |
| **合计** | **~$9/月起** |
