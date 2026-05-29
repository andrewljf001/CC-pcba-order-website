# PCBAForge 订单网站 — 项目进度管理

> 仓库：andrewljf001/CC-pcba-order-website
> 业务定位：小批量 PCB · SMT · 插件 · 功能验证 一条龙服务
> 技术栈：前端 HTML/CSS/JS · 后端 Node.js + Express · 数据库 Cloudflare D1 · 存储 Cloudflare R2

## 当前阶段
Phase 7 基本收尾 — 剩余项已暂缓/取消/等待
- 7.2 SEO 暂缓（用户暂不做）
- 7.3 多语言 取消（用户暂无精力）
- 7.4 GA4 等待用户提供 G-XXXXXXXXXX
- 下一个大方向：Phase 6 本地同步工具（Mac），视用户意愿启动

## 阶段总览
Phase 1-5 全部完成（业务架构/报价计算器/后端用户体系/运营后台/支付接入）
Phase 6 本地同步工具（Mac）待开始
Phase 7 上线优化 基本完成（剩余暂缓/取消/等待）

## Phase 7 明细
- 7.1 域名HTTPS 完成
- 7.2 SEO 暂缓
- 7.3 多语言 取消
- 7.4 GA4 等G-ID（cookie-consent.js已预留consent mode）
- 7.5 图片本地化 完成（图片+路径已同步GitHub防覆盖）
- 7.6 privacy.html 完成
- 7.7 terms.html 完成
- 7.8 Cookie横幅 完成（全站注入）
- 7.9 GDPR数据删除 完成（gdpr-delete.html+公开/管理员接口）
- 7.10 shipping.html 完成
- 7.11-7.13 博客系统 完成
- 7.14 CloudflareWAF 搁置（需Pro版，Nginx限流替代）
- 7.15-7.19 安全加固 完成
- 7.20 D1备份到R2 完成（backup.js+restore.js+cron每日3点+保留30天+邮件）
- 7.21-7.27 PM2自启/安全手册/R2上传/Zoho邮件/忘记密码/重置密码/nav统一 完成

## 已修复Bug（2026-05-29 E2E测试发现）
- 首页报价逻辑与报价页不一致 → 已对齐（$50/$75/$100、$200/$400）
- 改报价SQL参数绑定错（$6重复）→ 后台改报价曾彻底失效，已修（$6/$7）
- 支付创建SQL参数错（$2重复）→ 客户曾无法发起支付，已修（$2/$3）
- orders表缺payment_intent列 → 支付流程曾中断，已加列+database.js migration
注意：D1用?占位符（database.js把\$N全转?），不支持重复引用同一\$N。写SQL每个占位符按顺序对应一个参数。

## 测试&运维资产（2026-05-29新增）
- test-e2e.js E2E测试（线上只读项；临时无Turnstile实例跑完整链路需E2E_BYPASS_TURNSTILE=1+ADMIN_EMAIL/ADMIN_PASS）
- backup.js D1→R2每日备份
- restore.js R2→D1恢复（含恢复前快照）
- docs/operations.md 运维手册
- docs/数据恢复指南.md 傻瓜式恢复步骤

## Phase 6 本地同步工具（Mac，未开始）
6.1框架/6.2订单号映射/6.3嘉立创适配器/6.4状态推送API/6.5定时同步/6.6Mac菜单栏APP

## 工作日志
2026-05-25~28 Phase1-5完成，域名上线，D1+R2，Nginx，PM2，安全加固，Zoho邮件，PayPal+GooglePay+ApplePay
2026-05-29 7.5图片本地化/7.8Cookie横幅/7.9GDPR删除/7.20备份恢复/运维文档/修首页报价bug/E2E测试发现并修3个真bug/决策7.3取消7.2暂缓7.4等G-ID
待办：4条测试订单（@pcbaforge-test.com）待人工跑测后清理

## 下一步（视用户意愿）
- 待恢复：7.4 GA4（给G-ID后一步到位）、7.2 SEO（暂缓）
- 大方向：Phase 6 本地同步工具（对接嘉立创、订单状态同步、Mac菜单栏APP）
- 零散收尾：人工完整跑一遍真实下单；清理测试数据
