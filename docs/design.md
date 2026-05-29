# PCBAForge 订单网站 — 功能模块设计

> 最后更新：2026-05-29  
> 状态：✅ 定稿（第七版，经业主逐条确认）

---

## ⚠️ 重要开发规则（Claude 必须遵守）

**🚫 禁止改变现有网页的视觉风格、配色、布局和 CSS。**

- 只允许修改内容（文字、字段、业务逻辑、API）
- 不允许重写整个 HTML 文件的样式部分
- 不允许更换配色方案、字体、卡片样式、导航结构
- 如需新增 UI 元素，必须沿用现有的 class 命名和样式风格
- 每次修改前必须先读取现有文件，在现有基础上修改，不得全量替换

---

## 一、业务定位

精品小批量路线，核心优势是减少客户麻烦：
- 真人工程师响应，WhatsApp 直接沟通
- **核心竞争力：PCBA 功能性验证 + 专属工程师远程调试支持**
- 灵活小批量（样品 ≤ 20片），一条龙省心
- 海外客户友好：英文沟通、PayPal 付款
- 所有 PCB 符合 RoHS 标准

---

## 二、服务三栏

### ① PCB Fabrication
- 徽章：`FROM $50`
- 描述：FR4 single to multi-layer boards. Standard prototype pricing from $50. Complex specs quoted manually.

### ② PCB + SMT Assembly
- 徽章：`FROM $200`
- 描述：We fabricate your PCB and assemble components. Customer-supplied or sourced by us. Standard pricing up to 20 pcs.

### ③ Full Turnkey + Testing
- 徽章：`ENGINEER VERIFIED`
- 描述：Full fabrication, assembly, and functional verification. Our engineer works with you remotely to validate your board before it ships.

---

## 三、服务包含关系

```
PCB 制板
    ↑ 必须包含（不能只做贴片/插件而 PCB 外发）
PCB + SMT 贴片 / 插件
    ↑ 必须包含（功能验证必须做完整板）
Full Turnkey + Testing
```

| 组合 | 是否可接 |
|------|---------|
| 只做 PCB | ✅ |
| PCB + SMT/插件（客供或代采） | ✅ |
| PCB + SMT/插件 + 功能验证 | ✅ |
| 只做 SMT/插件（PCB 外发） | ❌ 不接 |
| 纯插件板（无 SMT） | ❌ 不接 |
| 电源板 | ❌ 不接 |

---

## 四、报价逻辑

### 4.1 PCB 标准报价（三档，其余全部人工报价）

| 档位 | 价格 | 条件 |
|------|------|------|
| 一档 | $50 | FR4，板厚 0.6～2.0mm，钻孔 ≥ 0.3mm，不含阻抗控制，层数 ≤ 4L，≤ 20×20cm，≤ 20片 |
| 二档 | $75 | FR4，板厚 0.6～2.0mm，钻孔 ≥ 0.3mm，含阻抗控制，层数 ≤ 4L，≤ 20×20cm，≤ 20片 |
| 三档 | $100 | FR4，板厚 0.6～2.0mm，钻孔 0.2/0.25mm，含阻抗控制，层数 ≤ 4L，≤ 20×20cm，≤ 20片 |

层数选项：**1L / 2L / 4L / 6L / 8L**（只有双数，6L/8L 触发人工报价）

触发人工报价（任一满足）：层数 > 4L、材质非 FR4、板厚超出 0.6～2.0mm、钻孔 < 0.2mm、尺寸 > 20×20cm、数量 > 20片

### 4.2 SMT + DIP 标准报价（全包价，其余全部人工报价）

所有点数、IC数量均以**单板**为单位计算。

| 条件 | 价格 |
|------|------|
| ≤ 20片，单板SMT点数 ≤ 200，单板复杂IC < 10个，单面，元件客供 | **$200** |
| ≤ 20片，单板SMT点数 ≤ 200，单板复杂IC < 10个，双面，元件客供 | **$400** |
| 单板插件 ≤ 100脚 | 含在全包价内，不另收费 |
| 其余 | 人工报价 |

> 复杂 IC 定义：BGA / QFN / LGA / BTC 等不可视焊点封装（单板数量）

触发人工报价（任一满足）：数量 > 20片、单板SMT点数 > 200、单板复杂IC ≥ 10个、单板DIP插件脚数 > 100、元件选代采（Turnkey）

### 4.3 Full Turnkey + Testing
- 全部人工报价，无标准价
- 客户须提供：PCB 文件 + 坐标文件 + 验证方案说明文档

### 4.4 元件代采
- 全部触发人工报价

---

## 五、系统自动判断逻辑

```
客户填写参数
    ↓
符合标准报价条件？
    ↓ 是                          ↓ 否
显示标准起价                  不显示任何价格
（仅供参考，非最终价）          显示「Manual Quote Required」
按钮：Submit Inquiry →         按钮：Submit Inquiry →
        ↓                               ↓
   工程师审核确认               工程师 24h 内联系客户
        ↓                               ↓
   发送付款链接                   双方确认价格后付款
        ↓
     开始生产
```

---

## 六、询价表字段（quote.html）

### 6.1 服务选择（勾选组合模式）
- PCB Fabrication
- SMT + DIP Assembly
- Functional Testing

### 6.2 PCB 参数
| 字段 | 选项 |
|------|------|
| 材质 | FR4 / Flex / Aluminum / Rogers / PTFE / Other（非FR4触发人工） |
| 层数 | 1L / 2L / 4L / 6L / 8L（> 4L 触发人工） |
| 板厚 | 0.6 / 0.8 / 1.0 / 1.2 / 1.6（默认）/ 2.0mm |
| 钻孔最小尺寸 | ≥ 0.3mm / 0.25mm / 0.2mm / 0.15mm（< 0.2mm 触发人工） |
| 阻抗控制 | No / Yes |
| 尺寸 | 宽 × 高（mm） |
| 数量 | 数字输入 |
| 表面处理 | LeadFree HASL / ENIG |
| 铜厚 | 1oz / 2oz |
| 阻焊颜色 | Green / Black / Blue / Red / White / Yellow |

### 6.3 SMT + DIP 参数
| 字段 | 说明 |
|------|------|
| 板子来源 | 客供 / PCBAForge 制板 |
| 元件供应 | 客供（CMS）/ 代采（Turnkey，触发人工） |
| 数量 | 数字输入（片数） |
| SMT PADS / BOARD | 单板贴片点数，无则填 0 |
| DIP PINS / BOARD | 单板插件脚数，无则填 0，≤ 100 不另收费 |
| COMPLEX IC / BOARD | 单板复杂IC数量（BGA/QFN/LGA/BTC），≥ 10 触发人工 |
| 贴片面 | 单面 / 双面 |

### 6.4 Functional Testing
- 全部人工报价
- 须填写测试说明（必填）
- 须上传测试规格文档

### 6.5 文件上传
- Gerber / BOM / 坐标文件 / 测试文档

### 6.6 联系信息
- Name / Email / WhatsApp / Company

### 6.7 备注
- 特殊需求文本框

---

## 七、下单流程

### 标准单
```
填表提交 → 工程师审核确认 → 工程师发送付款链接
→ 客户付款（PayPal）→ 生产（约1周）
→ 完成后报运费 → 客户补付运费 → 发货 → 完成
```

### 人工报价单
```
填表提交 → 工程师联系客户（24小时内）→ 双方确认价格
→ 工程师发送付款链接 → 客户付款 → 生产 → 发货 → 完成
```

---

## 八、元件供应

| 方式 | 说明 | 报价方式 |
|------|------|---------|
| 客供（CMS） | 客户自行寄送至深圳市龙岗区利好工业园 | 含在整体报价内 |
| 代采（Turnkey） | 我方根据 BOM 采购 | 人工报价 |

---

## 九、支付方式

- **PayPal**（主要）
- Apple Pay / Google Pay（通过 PayPal APM）

---

## 十、交期

| 阶段 | 时间 |
|------|------|
| 生产 | 约1周 |
| 运输 | 约1周 |
| **总计** | **约2周到手** |

---

## 十一、后台功能

- 订单列表（按状态筛选）
- 订单详情：客户信息、参数、文件下载、报价填写、状态更新、物流单号
- 报价参数管理
- 网站内容管理
- 博客管理
- 系统设置（SMTP、PayPal、WhatsApp 等）
- 客户管理 + 密码重置
