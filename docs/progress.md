# PCBAForge 进度追踪 — andrewljf001/CC-pcba-order-website
> 面向海外工程师的小批量 PCB · SMT · 插件一条龙接单平台
> 技术栈：HTML/CSS/JS · Node.js + Express · SQLite → Cloudflare D1 · Cloudflare R2

## 当前进度
**Phase 1–8 全面完成 ✅**
网站已上线，所有功能收尾完毕，进入运营/增长阶段。

---

## Phase 完成情况

### Phase 1–7 全部完成
- 基础框架、报价器、后端接口、文件上传、支付、订单追踪、前台完善
- GDPR cookie consent、D1→R2 备份、PayPal v6 + Google Pay + Apple Pay
- 管理后台（订单/客户/支付/设置）、E2E 测试 17/17 通过
- Turnstile 人机验证、Nginx 性能优化

### Phase 8 完成（2026-06-05）✅
- ✅ contact.html 独立联系页（含表单、FAQ、渠道卡片）
- ✅ 全站导航更新：nav 统一包含 Contact 链接
- ✅ sitemap 已包含 contact.html（server.js staticPages）
- ✅ robots.txt 正常（Allow: / 覆盖所有页面）
- ✅ 博客文章"What Is PCBA? The Complete Guide"已写入数据库
- ✅ Apple Pay 域名验证完成（pcbaforge.com 已在 PayPal 注册）
- ✅ Apple Pay 验证文件部署：public/.well-known/apple-developer-merchantid-domain-association
- ✅ GA4 埋点完成：G-7966B84XT6（PCBAForge 独立媒体资源）加入全站 11 个页面

---

## 技术配置记录

| 项目 | 值 |
|------|-----|
| GA4 Measurement ID | G-7966B84XT6 |
| GA4 属性 | PCBAForge（独立媒体资源） |
| Apple Pay 域名 | pcbaforge.com（PayPal 已验证）|
| PayPal App | PCBAForge（Live，5/28/26 创建）|

---

## 剩余技术债（低优先级）
- [ ] 测试订单清理（4条 @pcbaforge-test.com 邮箱的测试数据）
- [ ] fail2ban 阈值调高（maxretry=10）防止开发时频繁被封IP

---

## 下一阶段：运营 & 增长
- Google Search Console 提交 sitemap，监控收录
- SEO 内容建设（博客文章持续更新）
- GA4 电商转化追踪（quote 提交、payment 完成事件）
- Cloudflare WAF / Bot Fight Mode 策略收紧
