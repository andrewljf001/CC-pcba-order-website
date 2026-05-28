# PCBAForge 订单网站 — 项目进度管理

> 仓库：`andrewljf001/CC-pcba-order-website`  
> 业务定位：小批量 PCB · SMT · 插件 · 功能验证 一条龙服务  
> 技术栈：前端 HTML/CSS/JS · 后端 Node.js + Express · 数据库 Cloudflare D1 · 存储 Cloudflare R2

---

## 📌 当前阶段

🟡 **Phase 7 进行中 — 下一步：7.20 D1 备份 → 7.2 SEO**

---

## 🗂 阶段总览

```
Phase 1  业务架构定稿 & 首页 DEMO              ✅ 完成
Phase 2  报价计算器（三模式 + 前端模块建设）    ✅ 完成
Phase 3  后端基础 & 用户体系 & 询价下单        ✅ 完成
Phase 4  运营后台 + 架构迁移 + VPS 部署        ✅ 完成
Phase 5  支付接入                              ✅ 完成
Phase 6  本地同步工具（Mac）                   ⬜ 待开始
Phase 7  上线优化 & 运营功能                   🟡 进行中
```

---

## ✅ Phase 5 — 支付接入（完成）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 5.1 | PayPal 后端 API | ✅ 完成 | 创建订单、捕获付款 |
| 5.2 | track.html PAY NOW 按钮 | ✅ 完成 | Quoted 状态自动显示 |
| 5.3 | payment-success.html | ✅ 完成 | 支付成功确认页 |
| 5.4 | 支付成功后状态自动更新 | ✅ 完成 | 自动更新为 production |
| 5.5 | 付款确认邮件 | ✅ 完成 | 客户+管理员双向通知 |
| 5.6 | 后台 PayPal 配置 | ✅ 完成 | Client ID/Secret 加密存储，live/sandbox 切换 |
| 5.7 | PingPong 支付 | ❌ 不做 | 只做 PayPal |
| 5.8 | Apple Pay | ✅ 完成 | 仅苹果设备加载，域名验证路由已配置 |
| 5.9 | Google Pay | ✅ 完成 | PayPal APM SDK + Google Pay JS SDK |
| 5.10 | PayPal SDK 升级 v6 | ✅ 完成 | PayPal 走 v6 (`/web-sdk/v6/core`) |
| 5.11 | 三按钮统一风格 | ✅ 完成 | PayPal 黑绿极客风，Google Pay 深灰，Apple Pay 纯黑 |

---

## 🟡 Phase 7 — 上线优化 & 运营功能

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 7.1 | 正式域名 & HTTPS | ✅ 完成 | pcbaforge.com 上线 |
| 7.2 | SEO 优化 | ⬜ 待开始 | meta tags、sitemap.xml、robots.txt |
| 7.3 | 多语言支持 | ⬜ 待开始 | |
| 7.4 | 访客统计 | ⬜ 待开始 | Cloudflare Analytics 或 umami |
| 7.5 | 图片迁移到 R2 | ⬜ 待开始 | |
| 7.6 | privacy.html 隐私政策 | ✅ 完成 | |
| 7.7 | terms.html 服务条款 | ✅ 完成 | |
| 7.8 | Cookie 同意横幅（GDPR） | ⬜ 待开始 | |
| 7.9 | GDPR 数据删除流程 | ⬜ 待开始 | |
| 7.10 | shipping.html 货运政策 | ✅ 完成 | |
| 7.11 | blog.html 博客列表页 | ✅ 完成 | |
| 7.12 | blog-post.html 文章详情页 | ✅ 完成 | |
| 7.13 | 后台博客文章管理 CRUD | ✅ 完成 | 含编辑器面板 bug 修复 |
| 7.14 | Cloudflare WAF | ❌ 需 Pro 版 | Nginx 限流替代 |
| 7.15 | Cloudflare Bot Fight Mode | ✅ 完成 | |
| 7.16 | Cloudflare SSL Full Strict | ✅ 完成 | |
| 7.17 | Nginx 限流 | ✅ 完成 | 登录5次/分钟，API 30次/分钟 |
| 7.18 | Cloudflare Turnstile 人机验证 | ✅ 完成 | 后台+登录+注册+询价 |
| 7.19 | VPS SSH 安全加固 | ✅ 完成 | 非标端口+禁密码+UFW |
| 7.20 | D1 数据定期备份到 R2 | ⬜ 待开始 | 🔴 优先级高 |
| 7.21 | PM2 开机自启 | ✅ 完成 | VPS 重启自动恢复 |
| 7.22 | 安全手册 security.md | ✅ 完成 | docs/security.md |
| 7.23 | 文件上传 → R2 | ✅ 完成 | Gerber/BOM 安全存储 |
| 7.24 | Zoho Mail SMTP 配置 | ✅ 完成 | admin@pcbaforge.com |
| 7.25 | 忘记密码功能（前台） | ✅ 完成 | 邮件重置链接，1小时过期 |
| 7.26 | 后台管理员重置客户密码 | ✅ 完成 | 客户详情页 Reset Password 按钮 |
| 7.27 | 全站 nav/footer 统一 | ✅ 完成 | Blog、法律页链接全部对齐 |

---

## ⏳ Phase 6 — 本地同步工具（Mac）

| # | 任务 | 状态 |
|---|------|------|
| 6.1 | 工具框架搭建 | ⬜ 待开始 |
| 6.2 | 订单号映射机制 | ⬜ 待开始 |
| 6.3 | 嘉立创适配器 | ⬜ 待开始 |
| 6.4 | 状态推送 API | ⬜ 待开始 |
| 6.5 | 定时同步 / 手动触发 | ⬜ 待开始 |
| 6.6 | Mac 菜单栏 APP 封装 | ⬜ 待开始 |

---

## 📝 工作日志

### 2026-05-25
- 仓库初始化，README / pricing-logic.md 完成
- 完整业务闭环讨论定稿
- 技术架构确认：Railway + PostgreSQL + Node.js + Express

### 2026-05-26
- Phase 1 & 2 & 3 & 4 全部完成
- 后台全功能：登录、Dashboard、订单/客户管理、系统设置、邮件服务

### 2026-05-27（上午）
- 购买域名 pcbaforge.com（Cloudflare Registrar，$10.46/年）
- 创建 Cloudflare D1 + R2
- 架构决策：VPS 只跑业务逻辑，数据全在 Cloudflare

### 2026-05-27（下午/晚上）
- VPS Apache 彻底迁移 Nginx + PHP-FPM
- Node.js v20 + PM2 v7 安装
- Nginx 多站点：mrocioa.com + diyinai.com + pcbaforge.com
- SSL 证书（Let's Encrypt）+ Cloudflare CDN 橙云
- 品牌名全站：CC PCBA → PCBAForge
- database.js: pg → D1 HTTP API，SQLite 语法适配
- pcbaforge.com 正式上线，后台登录正常
- 新增博客模块：posts 表 + API + blog.html + blog-post.html
- 新增法律页面：privacy.html + shipping.html + terms.html
- 全站 nav/footer 统一

### 2026-05-28（上午/下午）
- 安全加固全面完成（UFW、Nginx限流、Turnstile、SSL、Bot Fight）
- PM2 开机自启配置完成
- 安全手册 docs/security.md
- 文件上传改造 → Cloudflare R2，static.pcbaforge.com 打通
- Zoho Mail 配置：admin@pcbaforge.com，MX/SPF/DKIM/DMARC 全部验证通过
- SMTP 接入后台设置，AES-256-GCM 加密存储密码
- 忘记密码功能：前台发重置邮件 + 后台管理员一键重置
- 后台博客编辑器面板 bug 修复

### 2026-05-28（晚上）
- **Phase 5 支付接入完成！**
- PayPal 新建应用 PCBAForge（Live 模式）
- 后端：/api/payment/create、/api/payment/capture、/api/payment/config
- track.html：quoted 状态自动显示支付按钮
- payment-success.html：支付成功确认页
- 支付成功后自动更新订单为 production
- 客户+管理员双向邮件通知
- 后台 Settings 加 PayPal 配置区

### 2026-05-29
- **支付三合一升级完成**
- PayPal 升级至 v6 SDK（`/web-sdk/v6/core`），用 `createPayPalOneTimePaymentSession`
- Google Pay 接入：PayPal APM SDK (`components=googlepay`) + Google Pay JS SDK，`paypal.Googlepay().config()` 标准流程
- Apple Pay 接入：PayPal APM SDK (`components=applepay`) + Apple Pay JS SDK，`ApplePaySession` 标准流程
- 三个 SDK 完全独立加载，互不干扰
- Apple Pay 双层过滤：UA 检测 + `ApplePaySession.canMakePayments()`，非苹果设备零加载
- 按钮风格统一：PayPal 黑底绿边 Orbitron，Google Pay 深灰白字，Apple Pay 纯黑白字
- server.js：`/.well-known/apple-developer-merchantid-domain-association` 域名验证路由（三路读取）
- Apple Pay 域名激活步骤已记录（待部署后手动执行）

---

## 🔑 状态图例

| 符号 | 含义 |
|------|------|
| ✅ | 完成 |
| 🟡 | 进行中 |
| ⬜ | 待开始 |
| ❌ | 搁置 / 取消 |

---

## ⚙️ Apple Pay 激活步骤（部署后执行）

1. 登录 [PayPal Developer Dashboard](https://developer.paypal.com) → 应用 PCBAForge → 勾选启用 **Apple Pay**
2. 下载 Live 域名验证文件：https://paypalobjects.com/devdoc/apple-pay/well-known/apple-developer-merchantid-domain-association
3. 上传到 VPS：`public/.well-known/apple-developer-merchantid-domain-association`（无扩展名，`Content-Type: application/octet-stream`）
4. PayPal 后台 → Features → Apple Pay → Manage → **Add Domain** → 输入 `pcbaforge.com` → **Register Domain**
5. 验证通过 → Safari/iOS 用户付款页自动出现 Apple Pay 按钮

**注意：** 验证文件必须通过 HTTPS 且不能有 3XX 重定向，不能放在防火墙后面。

---

## 🚀 下一步优先顺序

1. **7.20** D1 数据定期备份到 R2（数据安全，最高优先）
2. **7.2** SEO 优化（sitemap.xml、robots.txt、全站 meta）
3. **7.8** Cookie 同意横幅（GDPR 合规）
4. **7.4** 访客统计接入

*每次开工前更新当前阶段，完成一项打 ✅，工作日志按日期追加。*
