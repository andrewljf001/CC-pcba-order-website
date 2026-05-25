# CC-pcba-order-website

> Built by Claude (CC prefix = Claude-built repos)

## 项目定位

**PCBA 一站式接单网站** — 面向海外工程师与采购商，支持三种订单模式：

| 模式 | 说明 |
|------|------|
| 纯 PCB | 只制板，不贴片 |
| SMT 贴片 | PCB制板 + 表贴元件焊接 |
| 插件 / DIP | PCB制板 + 直插元件焊接 |
| SMT + 插件混合 | 全工序 Turnkey 交付 |

## 核心功能规划

### 报价计算器（三模式切换）
- **PCB 参数**：层数、尺寸、数量、工艺
- **SMT 参数**：贴片元件种类数（独特料号 unique parts）、贴片点数、单双面
- **插件参数**：插件点数、是否波峰焊
- **混合模式**：SMT + 插件同时配置
- 实时出价，WhatsApp 一键发送报价单

### 文件上传引导
- Gerber 文件（PCB制板用）
- BOM 表（元件清单）
- 贴片坐标文件（Pick & Place）
- 明确说明哪种订单需要哪些文件

### 工艺能力展示
- PCB 制板规格（同 pcb-order-website）
- SMT 最小封装（0201 / 01005）
- X-Ray / AOI 检测说明
- IPC 标准等级说明

## 技术架构

- **前端**：纯 HTML + CSS + JS，单文件可独立运行
- **样式**：极客绿黑风（延续 pcb-order-website 风格）
- **图片**：Unsplash 真实 PCBA 图片
- **后端预留**：Strapi（参考 docs/backend-plan.md）
- **接单转化**：WhatsApp 报价跳转（后期接 API）

## 仓库结构

```
CC-pcba-order-website/
├── README.md
├── index.html          # 主站单文件 DEMO（GitHub Pages）
├── docs/
│   ├── design.md       # 设计规范
│   ├── progress.md     # 任务进度
│   ├── pricing-logic.md # 报价逻辑文档
│   └── backend-plan.md # 后台迁移方案
└── assets/
    └── images/
```

## 里程碑

| 版本 | 目标 |
|------|------|
| v1.0 | 完整首页 DEMO，三模式报价计算器，GitHub Pages 上线 |
| v1.1 | 工艺能力页、文件上传引导、联系页 |
| v2.0 | Strapi 后台接入，订单管理，邮件通知 |

---
**仓库**：`andrewljf001/CC-pcba-order-website` · 私有 · Claude 构建
