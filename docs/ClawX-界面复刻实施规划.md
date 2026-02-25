# OpenClaw Office 复刻 ClawX 界面能力优化规划（UI-Only）

## 0. 范围澄清（按最新要求）

### 0.1 明确纳入
1. 复刻 ClawX 的多页面工作台能力（Dashboard/Channels/Skills/Cron/Settings + 全局布局）
2. Chat 不做独立页面复刻，改为**嵌入现有 Office 2D/3D 视图底部对话框**（Docked Chat Composer + Timeline Drawer）
3. 仅界面与前端状态层，后端启动与 Electron 主进程能力不在本期

### 0.2 明确排除
1. 不复刻 Setup 引导向导（6 步）
2. 不实现 OpenClaw Gateway 启停、CLI 安装、真实系统配置写入
3. 不依赖 Electron IPC 才能运行（需要 Web 端可演示）

---

## 1. 以项目总目标重构复刻思路（不是机械照搬）

## 1.1 OpenClaw Office 的核心目标
OpenClaw Office 的主价值是“实时可视化 + 可操作的 Agent 协作监控”。因此复刻策略应是：
- 保留 Office 作为主舞台
- 将 ClawX 的“控制台能力”嵌入 Office，而不是反客为主替代 Office

## 1.2 产品形态决策
采用“**Office 主屏 + 管控页面 + 底部对话**”三层形态：
1. Office 页（主入口）
- 2D/3D 办公室
- 底部 Chat Dock（替代 ClawX Chat 页面）
- 右侧/浮层保留现有 Agent 监控能力

2. 管控页（侧栏导航）
- Dashboard
- Channels
- Skills
- Cron
- Settings

3. 全局体验一致性
- 统一状态颜色、Loading/Error/Empty 模式
- 统一交互反馈（toast/confirm/disabled）

---

## 2. 基于父级 OpenClaw 源码的能力对齐（关键）

下列结论已基于父目录源码核对，避免规划脱离实际：

### 2.1 Gateway 方法与事件（可对齐）
来源：`../src/gateway/server-methods-list.ts`
- 已存在方法：
  - `chat.history` / `chat.send` / `chat.abort`
  - `sessions.list` / `sessions.preview`
  - `channels.status`
  - `skills.status` / `skills.install` / `skills.update`
  - `cron.list` / `cron.add` / `cron.update` / `cron.remove` / `cron.run`
  - `agents.list` / `tools.catalog` / `usage.status`
- 已存在事件：`agent` / `chat` / `presence` / `health` / `heartbeat` / `cron` / `connect.challenge`

### 2.2 Agent 事件协议（可直接复用）
来源：`../src/infra/agent-events.ts`
- `AgentEventPayload` 与当前 Office 已使用格式一致：
  - `runId`, `seq`, `stream`, `ts`, `data`, `sessionKey?`
- 这意味着 Office + 底部 Chat 可共享同一条实时事件流，不需要双协议。

### 2.3 WS 帧与认证（后续可接真实，但本期 UI-only）
来源：`../src/gateway/protocol/schema/frames.ts`、`../src/gateway/server/ws-connection.ts`
- `connect.challenge` + `connect` + `hello-ok` 流程明确
- 本期先做 UI Adapter，保留该协议抽象，避免后续重写

### 2.4 对复刻范围的直接影响
1. Chat 作为 Dock 嵌入 Office是合理的：
- 数据源可复用 `chat.* + agent event`
- 不会破坏 Office 核心定位
2. Channels/Skills/Cron/Settings 页面可以做 UI 先行：
- 前端方法名直接按 Gateway 真实方法建接口，后续替换 Mock 即可

---

## 3. 目标架构（执行方必须遵守）

## 3.1 分层
1. `UI Layer`
- 页面与组件

2. `State Layer`（Zustand）
- `office-store`（保留）
- `chat-dock-store`（新增）
- `dashboard-store` / `channels-store-ui` / `skills-store-ui` / `cron-store-ui` / `settings-store-ui`

3. `Gateway Adapter Layer`（新增）
- 定义与 OpenClaw 方法同名的接口（Promise + event subscription）
- 提供 `mock` 与 `gateway` 两种实现

4. `Domain Mapping Layer`（新增）
- 将 Gateway 原始 payload 转换为 UI ViewModel
- 页面禁止直接消费原始 payload

## 3.2 关键设计约束
1. 页面组件内禁止直接 `window.electron.ipcRenderer.invoke/on`
2. 所有远程操作必须走 Adapter（便于 Web 运行与测试）
3. 任何状态更新必须可追踪（store action 命名清晰）
4. Office 3D 渲染线程与 Chat 更新节流分离（避免渲染抖动）

---

## 4. 页面与功能复刻清单（更新版）

## 4.1 Office + 底部 Chat Dock（替代 ClawX Chat 页）

### 4.1.1 结构
1. `ChatDockBar`（底部固定）
- 输入框
- 附件按钮
- 发送/停止按钮
- 会话选择 + 新建会话 + thinking toggle + refresh

2. `ChatTimelineDrawer`（可展开）
- 消息流渲染（user/assistant）
- markdown
- thinking 折叠块
- tool_use 卡片
- streaming tool status
- 图片预览与 lightbox

### 4.1.2 交互与状态
1. 输入
- Enter 发送，Shift+Enter 换行
- IME 组合输入防误发

2. 附件
- 文件选择/粘贴/拖拽
- staging/ready/error 生命周期

3. 发送链路
- optimistic user message
- streaming delta/final/error/aborted
- tool_result 汇总附图逻辑

4. 与 Office 联动
- 选中 Agent 时可设置会话上下文（可选）
- 聊天事件不阻塞 2D/3D 渲染

## 4.2 Dashboard
- Gateway 状态、channels 连接数、skills 启用数、uptime
- 快捷操作入口（跳转 channels/skills/settings 等）
- 已连接渠道和活跃技能概览
- 非运行态告警卡

## 4.3 Channels
- 渠道统计卡
- 已配置渠道列表（状态/删除）
- 可用渠道网格
- 配置弹窗：动态字段、密文显隐、验证、保存
- WhatsApp QR 流程 UI（即使本期 mock，也要保留状态机）

## 4.4 Skills
- Installed / Marketplace 双 tab
- 启停、安装、卸载
- 详情弹窗（info/config）
- skill config（apiKey/env）编辑与保存
- 来源筛选（built-in / marketplace）

## 4.5 Cron
- 任务统计（总数/活跃/暂停/失败）
- 任务卡（启停、编辑、删除、立即执行）
- 创建/编辑弹窗（预设 cron + 自定义 cron + 渠道目标）

## 4.6 Settings
- Appearance（theme/language）
- Providers（add/edit/delete/default/validate）
- Gateway 状态展示与操作按钮（UI-only）
- Updates（check/download/install UI 状态）
- Advanced/Developer/About

## 4.7 全局布局
- `MainLayout`
- `Sidebar`（含折叠）
- `TitleBar`（Web 仿真版本）
- 全局 `Toaster` / `TooltipProvider`

---

## 5. 重点优化：Office 场景下 Chat Dock 的工程方案

## 5.1 性能策略
1. Chat timeline 虚拟列表（或分段渲染）
2. streaming updates 批处理（50~100ms）
3. 3D 场景与聊天状态分 store，避免全树重渲染

## 5.2 可用性策略
1. 在 2D/3D 下均固定底部高度与安全区
2. 移动窗口高度不足时自动折叠成输入条
3. 输入焦点与快捷键不影响场景操作（ESC 关闭抽屉、Enter 发送）

## 5.3 扩展策略
1. 保留“弹出独立聊天页”的能力开关（未来可选）
2. Dock 状态（展开/收起/高度）持久化

---

## 6. 分阶段执行计划（供 Cursor/Claude 执行）

### Phase A：架构底座
1. 建立路由与 MainLayout
2. 建立 Adapter 接口与 Mock 实现
3. 建立新增 stores 骨架

完成度检查：
- [ ] 所有页面可访问
- [ ] 不依赖 Electron 即可跑通页面
- [ ] Adapter 替换点完整

### Phase B：Office + Chat Dock（优先）
1. 完成 ChatDockBar + ChatTimelineDrawer
2. 完成 message-utils 与 chat store 流程
3. 解决 2D/3D 同屏性能问题

完成度检查：
- [ ] 输入/发送/停止/附件流程可用
- [ ] streaming/tool/thinking 正常显示
- [ ] 2D/3D 场景帧率无明显下降

### Phase C：Dashboard + Channels + Skills + Cron
1. 逐页复刻功能
2. 对齐空态/错误态/加载态

完成度检查：
- [ ] 每页主流程可走通
- [ ] 所有关键按钮有状态反馈
- [ ] mock 数据下可稳定演示

### Phase D：Settings 与全局一致性
1. Providers/Updates/Developer 等模块
2. 视觉规范统一与交互收口

完成度检查：
- [ ] Settings 全模块可用
- [ ] 跨页状态一致
- [ ] UI 交互无断链

### Phase E：测试与评审收口
1. 增加关键测试（store + 组件关键交互）
2. 进行“ClawX 功能对照表”验收

完成度检查：
- [ ] 覆盖 Office+Dock 核心链路
- [ ] 覆盖 Channels/Skills/Cron 关键表单链路
- [ ] 对照表无未解释缺项

---

## 7. Review 预检清单（给执行方与审查方）

## 7.1 易遗漏项
1. Chat 附件的 staging 错误态与重试
2. tool_result 图片挂载到最终 assistant 消息
3. Channels 的 QR 流程状态（qr/success/error/cancel）
4. Skills 的 core skill 禁用保护
5. Cron 的 Discord channelId 特殊校验
6. 设置页 auto-download 与 update store 同步

## 7.2 架构红线
1. 不允许页面直接访问 IPC
2. 不允许把 Setup 逻辑重新引入
3. 不允许用独立 Chat 页面替代底部 Dock（除非明确新增开关且默认关闭）

## 7.3 验收标准（最终）
1. 功能覆盖：除 Setup 外，ClawX 界面能力全部可见可操作
2. 形态正确：Chat 仅作为 Office 底部对话能力
3. 可演示：无 Gateway 启停依赖也可完整演示
4. 可演进：接入真实 Gateway 时无需推翻 UI 层

---

## 8. 本次优化工作的完成确认

- [x] 已按最新要求移除 Setup 复刻
- [x] 已将 Chat 改为 Office 底部嵌入方案
- [x] 已基于父级 OpenClaw 源码进行能力校对并回写规划
- [x] 已补充执行分阶段、完成度检查、评审预检与红线约束

> 该文档可直接交由 Cursor 与 Claude Code 执行，并支持审查时逐项核对。
