# PCBAForge 订单网站 — 项目进度管理

> 仓库：`andrewljf001/CC-pcba-order-website`  
> 业务定位：小批量 PCB · SMT · 插件 · 功能验证 一条龙服务  
> 技术栈：前端 HTML/CSS/JS · 后端 Node.js + Express · 数据库 Cloudflare D1 · 存储 Cloudflare R2

---

## 📌 当前阶段

🟡 **Phase 4 — VPS 部署完成，网站上线运行中**

---

## 🗂 阶段总览

```
Phase 1  业务架构定稿 & 首页 DEMO              ✅ 完成
Phase 2  报价计算器（三模式 + 前端模块建设）    ✅ 完成
Phase 3  后端基础 & 用户体系 & 询价下单        ✅ 完成
Phase 4  运营后台 + 架构迁移 + VPS 部署        🟡 进行中
Phase 5  支付接入
Phase 6  本地同步工具（Mac）
Phase 7  上线优化 & 运营功能
```

---

## ✅ Phase 1 — 业务架构定稿 & 首页 DEMO

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 1.1 | 私有仓库初始化 | ✅ 完成 | |
| 1.2 | README 项目定位与结构 | ✅ 完成 | |
| 1.3 | docs/pricing-logic.md 报价逻辑 | ✅ 完成 | |
| 1.4 | docs/progress.md 进度管理 | ✅ 完成 | |
| 1.5 | 业务闭环讨论定稿 | ✅ 完成 | 见 design.md |
| 1.6 | 技术架构定稿 | ✅ 完成 | 见 backend-plan.md |
| 1.7 | docs/design.md 功能模块定稿（第四版） | ✅ 完成 | |
| 1.8 | docs/backend-plan.md 技术架构定稿（第二版） | ✅ 完成 | |
| 1.9 | Hero Banner — 品牌定位 + CTA | ✅ 完成 | |
| 1.10 | 服务三栏更新 | ✅ 完成 | |
| 1.11 | 下单流程图 | ✅ 完成 | |
| 1.12 | 响应式布局 | ✅ 完成 | |
| 1.13 | GitHub Pages 部署 | ✅ 完成 | |

---

## ✅ Phase 2 — 报价计算器（三模式 + 前端模块建设）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 2.1 | PCB 报价模式 | ✅ 完成 | 三档：$50/$75/$100 |
| 2.2 | SMT 报价模式 | ✅ 完成 | 全包价 $200/$400 |
| 2.3 | Full Turnkey 纯说明页 | ✅ 完成 | |
| 2.4 | 标准单/非标单 UI | ✅ 完成 | |
| 2.5 | 非标单 WA 联系入口 | ✅ 完成 | |
| 2.6 | 支付流程逻辑（审核后付款） | ✅ 完成 | |
| 2.7 | quote.html 全面重写 | ✅ 完成 | 三模式、参数预填、注册弹窗 |
| 2.8 | 首页参数携带跳转 quote.html | ✅ 完成 | |
| 2.9 | 各页面 footer / nav / WA 按钮 | ✅ 完成 | |
| 2.10 | 首页保护规则 | ✅ 完成 | 修改须经批准 |

---

## ✅ Phase 3 — 后端基础 & 用户体系 & 询价下单

### 3A · 后端基础

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 3A.1 | Node.js + Express 初始化 | ✅ 完成 | |
| 3A.2 | 数据库建表 | ✅ 完成 | 5张表自动建立 |
| 3A.3 | /api/settings/public 接口 | ✅ 完成 | |
| 3A.4 | 前台动态读取 settings | ✅ 完成 | WA号码、收件地址 |
| 3A.5 | JWT 认证（客户 + 管理员） | ✅ 完成 | 强制环境变量 |

### 3B · 用户体系

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 3B.1 | 邮箱注册 + 验证邮件 | ✅ 完成 | |
| 3B.2 | 邮箱 + 密码登录 | ✅ 完成 | JWT 7天有效 |
| 3B.3 | Google OAuth | ✅ 完成 | 后台可开关 |
| 3B.4 | GitHub OAuth | ✅ 完成 | 后台可开关 |
| 3B.5 | account.html 客户中心 | ✅ 完成 | 极客绿黑风 |
| 3B.6 | 个人信息编辑 | ✅ 完成 | |
| 3B.7 | 收货地址管理 | ✅ 完成 | 增删改查、默认地址 |
| 3B.8 | 第三方绑定管理 | ✅ 完成 | |
| 3B.9 | 历史订单列表 | ✅ 完成 | 含状态、金额、TRACK 按钮 |

### 3C · 询价下单

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 3C.1 | /api/inquiry 接口 | ✅ 完成 | 文件上传 + 入库 |
| 3C.2 | 询价提交邮件通知 | ✅ 完成 | 动态邮件服务 |
| 3C.3 | /api/order/lookup 订单查询 | ✅ 完成 | 邮箱验证身份 |
| 3C.4 | track.html 接入查询 API | ✅ 完成 | 含付款提示 |
| 3C.5 | 图片托管方案 | ⬜ 待开始 | 见 Issue #1 |

---

## 🟡 Phase 4 — 运营后台 + 架构迁移 + VPS 部署

### 4A · 运营后台

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 4.1 | 后台登录页 | ✅ 完成 | |
| 4.2 | Dashboard（统计、状态分布、近期订单） | ✅ 完成 | |
| 4.3 | 订单列表（筛选、搜索） | ✅ 完成 | |
| 4.4 | 订单详情（参数、报价、状态更新） | ✅ 完成 | |
| 4.5 | 发送付款链接 | ✅ 完成 | 审核通过后触发 |
| 4.6 | 客户列表 | ✅ 完成 | |
| 4.7 | 客户详情 + 历史订单 | ✅ 完成 | |
| 4.8 | 客户类型标记 + 运营备注 | ✅ 完成 | Normal/VIP/Blacklist |
| 4.9 | 强制解绑客户 OAuth | ✅ 完成 | |
| 4.10 | 收款记录 | ✅ 完成 | |
| 4.11 | 系统设置（WA、地址、报价参数、OAuth开关） | ✅ 完成 | |
| 4.12 | 管理员账号管理 | ✅ 完成 | |
| 4.13 | 邮件服务后台配置 | ✅ 完成 | SMTP/Resend切换 |
| 4.14 | 敏感配置 AES-256-GCM 加密存储 | ✅ 完成 | 密码/API Key加密 |
| 4.15 | 测试发信功能 | ✅ 完成 | 后台一键测试 |
| 4.16 | account.html 加入 nav 链接 | ⬜ 待开始 | |

### 4B · 架构迁移（Cloudflare D1 + R2）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 4.16 | 域名 pcbaforge.com 购买并接入 Cloudflare | ✅ 完成 | $10.46/年 |
| 4.16b | VPS Apache → Nginx 彻底迁移 | ✅ 完成 | Nginx 直接对接 PHP-FPM，去掉 Apache |
| 4.17 | Cloudflare D1 建库建表 | ✅ 完成 | pcbaforge-db，Eastern North America |
| 4.18 | Cloudflare R2 建存储桶 | ✅ 完成 | pcbaforge-files，Eastern North America |
| 4.18a | Cloudflare API Token 生成 | ✅ 完成 | 权限：D1 Edit + Workers R2 Storage Edit |
| 4.18b | 后台公司信息配置完善 | ⬜ 待开始 | 新增：营业地址、公司电话、Logo URL 等 |
| 4.18c | 前台动态读取公司信息 | ⬜ 待开始 | footer/联系页从 settings 动态读取 |
| 4.19 | 代码改造：pg → D1 HTTP API | ✅ 完成 | database.js 全面重写，SQLite 语法适配 |
| 4.20 | 代码改造：本地存储 → R2 | ⬜ 待开始 | multer → aws-sdk/client-s3 |
| 4.21 | VPS 环境配置（Node.js/Nginx/PM2） | ✅ 完成 | Node.js v20 + PM2 v7 |
| 4.22 | Nginx 多站点配置 | ✅ 完成 | mrocioa.com + diyinai.com + pcbaforge.com |
| 4.23 | SSL 证书配置（Let's Encrypt） | ✅ 完成 | pcbaforge.com 证书已申请 |
| 4.24 | 域名 DNS 指向 VPS + Cloudflare 橙云 | ✅ 完成 | CDN 加速已开启 |
| 4.25 | PM2 部署 + 全流程测试 | ✅ 完成 | 后台登录正常，D1 数据库正常 |

---

## ⏳ Phase 5 — 支付接入

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 5.1 | PayPal 支付接入 | ⬜ 待开始 | |
| 5.2 | PingPong 支付接入 | ⬜ 待开始 | |
| 5.3 | 运费补付流程 | ⬜ 待开始 | |
| 5.4 | 支付成功后状态自动更新 | ⬜ 待开始 | |
| 5.5 | track.html Quoted 状态显示支付按钮 | ⬜ 待开始 | |

---

## ⏳ Phase 6 — 本地同步工具（Mac）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 6.1 | 工具框架搭建（Node.js + Playwright） | ⬜ 待开始 | |
| 6.2 | 订单号映射机制 | ⬜ 待开始 | |
| 6.3 | 嘉立创适配器 | ⬜ 待开始 | 第一期供应商 |
| 6.4 | 状态推送 API | ⬜ 待开始 | |
| 6.5 | 定时同步 / 手动触发 | ⬜ 待开始 | |
| 6.6 | Mac 菜单栏 APP 封装 | ⬜ 待开始 | |
| 6.7 | 其他供应商适配器 | ⬜ 待开始 | |

---

## ⏳ Phase 7 — 上线优化 & 运营功能

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 7.1 | 正式域名绑定 & HTTPS | ✅ 完成 | pcbaforge.com 已上线 |
| 7.2 | SEO 优化 | ⬜ 待开始 | |
| 7.3 | 多语言支持 | ⬜ 待开始 | |
| 7.4 | 访客统计 | ⬜ 待开始 | |
| 7.5 | 图片全部迁移到自有存储 | ⬜ 待开始 | 见 Issue #1 |
| 7.6 | 隐私政策页面（Privacy Policy） | ⬜ 待开始 | |
| 7.7 | 服务条款页面（Terms of Service） | ⬜ 待开始 | |
| 7.8 | Cookie 同意横幅（GDPR） | ⬜ 待开始 | |
| 7.9 | GDPR 数据删除请求处理流程 | ⬜ 待开始 | |
| 7.10 | 隐私政策页面（privacy.html） | ⬜ 待开始 | |
| 7.11 | 货运政策页面（shipping.html） | ⬜ 待开始 | |
| 7.12 | Cloudflare WAF 防火墙规则配置 | ⬜ 待开始 | |
| 7.13 | Cloudflare Bot Fight Mode 开启 | ⬜ 待开始 | |
| 7.14 | Cloudflare SSL/TLS 模式设为 Full Strict | ⬜ 待开始 | |
| 7.15 | Cloudflare Rate Limiting 限流规则 | ⬜ 待开始 | |
| 7.16 | Cloudflare Turnstile 人机验证 | ⬜ 待开始 | |
| 7.17 | VPS SSH 安全加固 | ⬜ 待开始 | |
| 7.18 | D1 数据定期备份到 R2 | ⬜ 待开始 | |

---

## 📝 工作日志

### 2026-05-25
- 仓库初始化，README / pricing-logic.md 完成
- 完整业务闭环讨论定稿
- 技术架构确认：Railway + PostgreSQL + Node.js + Express

### 2026-05-26
- Phase 1 & 2 全部完成
- Phase 3 全部完成：后端 API、用户体系、OAuth、询价下单
- Phase 4 全部完成：后台登录、Dashboard、订单/客户管理、系统设置
- 邮件服务后台化：SMTP/Resend 可切换，密码 AES-256-GCM 加密存储
- account.html 客户中心完成

### 2026-05-27（上午）
- 购买域名 pcbaforge.com（Cloudflare Registrar，$10.46/年）
- 创建 Cloudflare D1 数据库：pcbaforge-db
- 创建 Cloudflare R2 存储桶：pcbaforge-files
- 架构决策：数据库迁移至 D1，文件存储迁移至 R2，VPS 只跑业务逻辑

### 2026-05-27（下午）
- VPS Apache 彻底迁移到 Nginx + PHP-FPM（去掉 Apache 中间层）
- 安装 Node.js v20 + PM2 v7
- Nginx 多站点配置：mrocioa.com + diyinai.com + pcbaforge.com
- SSL 证书申请（pcbaforge.com Let's Encrypt）
- 品牌名全站替换：CC PCBA → PCBAForge
- database.js 全面重写：pg → Cloudflare D1 HTTP API（SQLite 语法）
- server.js 全面适配：NOW() → datetime('now')，BOOLEAN → INTEGER，UUID 手动生成
- pcbaforge.com 正式上线，后台登录测试通过
- Cloudflare 橙云开启，CDN 加速生效

---

## 🔑 状态图例

| 符号 | 含义 |
|------|------|
| ✅ | 完成 |
| 🟡 | 进行中 |
| ⬜ | 待开始 |
| ❌ | 搁置 / 取消 |
| 🔁 | 需要返工 |

---
*每次开工前更新当前阶段，完成一项打 ✅，工作日志按日期追加。*
