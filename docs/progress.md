# PCBAForge 进度追踪 — andrewljf001/CC-pcba-order-website
> 面向海外工程师的小批量 PCB · SMT · 插件一条龙接单平台
> 技术栈：HTML/CSS/JS · Node.js + Express · SQLite → Cloudflare D1 · Cloudflare R2

## 当前进度
Phase 7 全面完成 ✅，进入后台完善+内容建设阶段
Phase 8 进行中：Content & SEO（博客文章+联系页面）

## Phase 完成情况
Phase 1-5 全部完成（基础框架/报价器/后端接口/文件上传/支付/订单追踪/前台完善）
Phase 6 完成：Mac 本地工具（Playwright抓取供应商状态）

## Phase 7 完成
- ✅ 7.1 HTTPS NTLM 验证
- 7.2 SEO 完善
- 7.3 结构化 Schema 使用
- 7.4 GA4 埋点+cookieID/cookie-consent.js（consent mode）
- 7.5 多浏览器本地工具/后台管理GitHubs上传/部署
- 7.6 privacy.html 完善
- 7.7 terms.html 完善
- 7.8 Cookie管理 用户授权
- ✅ cookie-consent.js 完成
- 7.9 GDPR数据删除申请/完整法律.html/两种gdpr-delete.html+两种内容gdpr-delete.html+两种修改
- 7.10 shipping.html 完善
- ✅ 7.11-7.13 多页面±完善 完善
- 7.14 CloudflareWAF 策略（防爬/限速，由nginx处理，外部配置）
- 7.15-7.19 各页面+完善
- 7.20 D1+R2 管理页面（backup.js+restore.js+cron备份）
- 7.21-7.27 PM2管理+支付/notify/PM2管理/blog/mail.smtp+resend/nav追踪/account.html 完善

## admin 完善+修复（2026-05-31）
- 完善订单管理SQL Parameter Binding+order details/sendclose/payment_link_sent/nav login states

## Phase 6 完成（Mac，当前完成）
6.1享用SMTP发送/6.2记录发送/6.3 阅览PM2管理页面/6.4 收益MUS API/6.5 多浏览器完善订单/6.6 Mac查看8DBQ的是否）

## Phase 7 完整进度（2025-05-29 E2E测试）
- test-e2e.js E2E测试脚本/关联 Turnstile/测试文件上传 E42E_SEPASS)
- 实施对应 12 秒钟.js D1➔R2 备份
- backup.js R2➔D1 备份含恢复 before snapshot)
- docs/operations.md 运维手册
- docs/供应商报价操作.md 供应商操作手册

## Phase 8 进行中
- ✅ **contact.html** 独立联系我们页（2026-05-31）
- ✅ **PCBA博客文章** "What Is PCBA? The Complete Guide" — scripts/seed-pcba-article.js（2026-05-31）
- 待完成：在服务器上运行 `node scripts/seed-pcba-article.js` 将文章写入数据库
- 待完成：更新 index.html/blog.html/track.html nav 加入 Contact 链接
- 待完成：robots.txt 加入 contact.html
- 待完成：sitemap 加入 contact.html（server.js staticPages）

## 技术负债
- [ ] 待完成：index.html nav 加入 Contact 链接
- [ ] 在server.js sitemap staticPages 加入 contact.html
- [ ] 服务器执行 node scripts/seed-pcba-article.js 写入文章

## 下一步（暂缓）
- 6.5= GA4 完整电商追踪（大任务）
- PM2管理更完善
