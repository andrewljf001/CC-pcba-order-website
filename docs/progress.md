# PCBAForge 订单网站 — 项目进度管理

> 仓库：`andrewljf001/CC-pcba-order-website`  
> 业务定位：小批量 PCB · SMT · 插件 · 功能验证 一条龙服务  
> 技术栈：前端 HTML/CSS/JS · 后端 Node.js + Express · 数据库 Cloudflare D1 · 存储 Cloudflare R2

---

## 📌 当前阶段

🟡 **Phase 4 完成，Phase 5（支付接入）待开始**

---

## 🗂 阶段总览

```
Phase 1  业务架构定稿 & 首页 DEMO              ✅ 完成
Phase 2  报价计算器（三模式 + 前端模块建设）    ✅ 完成
Phase 3  后端基础 & 用户体系 & 询价下单        ✅ 完成
Phase 4  运营后台 + 架构迁移 + VPS 部署        ✅ 完成
Phase 5  支付接入                              ⬜ 待开始
Phase 6  本地同步工具（Mac）                   ⬜ 待开始
Phase 7  上线优化 & 运营功能                   🟡 进行中
```

---

## ✅ Phase 1 — 业务架构定稿 & 首页 DEMO（完成）

## ✅ Phase 2 — 报价计算器（完成）

## ✅ Phase 3 — 后端基础 & 用户体系 & 询价下单（完成）

## ✅ Phase 4 — 运营后台 + 架构迁移 + VPS 部署（完成）

### 4A · 运营后台

| # | 任务 | 状态 |
|---|------|------|
| 4.1~4.15 | 后台全功能（登录、Dashboard、订单、客户、设置、邮件） | ✅ 完成 |
| 4.16 | account.html 加入 nav 链接 | ⬜ 待开始 |

### 4B · 架构迁移

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 4.16b | VPS Apache → Nginx + PHP-FPM 彻底迁移 | ✅ 完成 | |
| 4.17 | Cloudflare D1 建库 | ✅ 完成 | pcbaforge-db |
| 4.18 | Cloudflare R2 建存储桶 | ✅ 完成 | pcbaforge-files |
| 4.18a | Cloudflare API Token | ✅ 完成 | |
| 4.18b | 后台公司信息配置完善 | ⬜ 待开始 | |
| 4.18c | 前台动态读取公司信息 | ⬜ 待开始 | |
| 4.19 | pg → D1 HTTP API | ✅ 完成 | SQLite 语法适配 |
| 4.20 | 本地存储 → R2 | ⬜ 待开始 | |
| 4.21~4.25 | VPS 环境 + Nginx + SSL + DNS + PM2 | ✅ 完成 | |

---

## 🟡 Phase 7 — 上线优化 & 运营功能（进行中）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 7.1 | 正式域名 & HTTPS | ✅ 完成 | pcbaforge.com 上线 |
| 7.2 | SEO 优化 | ⬜ 待开始 | |
| 7.3 | 多语言支持 | ⬜ 待开始 | |
| 7.4 | 访客统计 | ⬜ 待开始 | |
| 7.5 | 图片迁移到 R2 | ⬜ 待开始 | |
| 7.6 | privacy.html 隐私政策 | ✅ 完成 | |
| 7.7 | terms.html 服务条款 | ✅ 完成 | |
| 7.8 | Cookie 同意横幅（GDPR） | ⬜ 待开始 | |
| 7.9 | GDPR 数据删除流程 | ⬜ 待开始 | |
| 7.10 | shipping.html 货运政策 | ✅ 完成 | |
| 7.11 | blog.html 博客列表页 | ✅ 完成 | |
| 7.12 | blog-post.html 文章详情页 | ✅ 完成 | |
| 7.13 | 后台博客文章管理 CRUD | ✅ 完成 | API 完成，后台 UI 待接入 |
| 7.14 | Cloudflare WAF 防火墙 | ⬜ 待开始 | |
| 7.15 | Cloudflare Bot Fight Mode | ⬜ 待开始 | |
| 7.16 | Cloudflare SSL Full Strict | ⬜ 待开始 | |
| 7.17 | Cloudflare Rate Limiting | ⬜ 待开始 | |
| 7.18 | Cloudflare Turnstile 人机验证 | ⬜ 待开始 | |
| 7.19 | VPS SSH 安全加固 | ⬜ 待开始 | |
| 7.20 | D1 数据定期备份到 R2 | ⬜ 待开始 | |

---

## ⏳ Phase 5 — 支付接入

| # | 任务 | 状态 |
|---|------|------|
| 5.1 | PayPal 支付接入 | ⬜ 待开始 |
| 5.2 | PingPong 支付接入 | ⬜ 待开始 |
| 5.3 | 运费补付流程 | ⬜ 待开始 |
| 5.4 | 支付成功后状态自动更新 | ⬜ 待开始 |
| 5.5 | track.html Quoted 状态显示支付按钮 | ⬜ 待开始 |

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
- 新增博客模块：posts 表 + API（公开读取 + 后台 CRUD）
- 新增前台页面：blog.html + blog-post.html
- 新增法律页面：privacy.html + shipping.html + terms.html
- 全站 nav/footer 统一，所有页面互相链接

---

## 🔑 状态图例

| 符号 | 含义 |
|------|------|
| ✅ | 完成 |
| 🟡 | 进行中 |
| ⬜ | 待开始 |
| ❌ | 搁置 / 取消 |

---
*每次开工前更新当前阶段，完成一项打 ✅，工作日志按日期追加。*
