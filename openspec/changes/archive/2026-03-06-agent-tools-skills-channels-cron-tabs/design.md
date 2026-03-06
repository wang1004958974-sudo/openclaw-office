## Context

智能体管理页面 (`/agents`) 已有六个 Tab：概览、文件、工具、技能、渠道、定时任务。其中概览和文件 Tab 功能完整，后四个 Tab 为占位组件。

OpenClaw Gateway 提供了以下编辑能力：
- **工具策略**：通过 `config.get` 读取 `agents.list[].tools`，通过 `config.patch` 写入
- **技能白名单**：通过 `config.get` 读取 `agents.list[].skills`，通过 `config.patch` 写入
- **定时任务**：通过 `cron.add/update/remove/run` 直接 CRUD，每个 task 有 `agentId` 字段
- **渠道**：`channels.status` 返回只读状态

本项目已有：
- 模型配置编辑模式（OverviewTab）：读 `config.get` → 本地编辑 → 通过 `agents.update` 保存
- 技能全局管理页面（`/skills`）：SkillCard + SkillDetailDialog + toggle/install
- 定时任务管理页面（`/cron`）：CronTaskCard + CronTaskDialog + CRUD
- 渠道管理页面（`/channels`）：ChannelCard + 状态展示

## Goals / Non-Goals

**Goals:**
- 实现工具 Tab 的展示 + 编辑：工具策略摘要 + 工具目录展示 + profile/allow/deny 编辑
- 实现技能 Tab 的展示 + 编辑：技能列表展示 + 技能白名单 checkbox 编辑
- 实现渠道 Tab 的只读展示：展示 Gateway 级渠道状态
- 实现定时任务 Tab 的展示 + 完整 CRUD：列表展示 + 新建/编辑/删除/启停/手动执行
- 保持与现有交互设计一致（Tab 切换、加载状态、空状态、弹窗编辑等）
- 复用已有组件（CronTaskDialog、CronTaskCard、SkillCard 样式）
- 编辑操作安全可控，不直接修改 OpenClaw 底层源码

**Non-Goals:**
- 渠道绑定管理（bindings CRUD）— 留给后续迭代
- 工具的单个启用/禁用 checkbox — 本期聚焦 profile 和 allow/deny 编辑
- 修改 OpenClaw 主项目源码

## Decisions

### 1. 工具策略编辑：config.patch 模式

**方案**：
- 读取：`tools.catalog(agentId)` 获取工具目录 + `config.get` 读取 `agents.list[].tools` 中的策略配置
- 编辑：本地修改 tools 配置对象（profile 选择、allow/deny 列表编辑）
- 保存：通过 `config.patch` 写入，修改 `agents.list` 数组中对应 agent 的 `tools` 字段
- Gateway 的 `config.patch` 接受 YAML 字符串，需将当前 config 快照中的 agent entry 更新后序列化回写

**理由**：与内置 UI 一致。`agents.update` 只支持 name/workspace/model/avatar，不支持 tools 字段；必须走 `config.patch`。

**编辑项**：
- `profile`：预设策略（full / minimal / custom），下拉选择
- `alsoAllow`：额外允许的工具列表，多选输入
- `deny`：明确禁止的工具列表，多选输入

### 2. 技能白名单编辑：config.patch 模式

**方案**：
- 读取：`skills.status(agentId)` 获取技能列表和当前 agent 的实际技能状态 + `config.get` 读取 `agents.list[].skills`（字符串数组，为空表示允许所有）
- 编辑：通过 checkbox 列表让用户选择允许哪些技能
- 两种模式：
  - "使用全部技能"（skills 字段为 undefined 或省略）
  - "仅使用选中的技能"（skills 字段为 `["skill-a", "skill-b", ...]`）
- 保存：通过 `config.patch` 写入 `agents.list[].skills`

**理由**：`agents.list[].skills` 是一个简单的字符串白名单数组，通过 config.patch 写入最直接。checkbox 选择模式与内置 UI 一致。

### 3. 定时任务 CRUD：直接复用 cron RPC + CronTaskDialog

**方案**：
- 读取：`cron.list` → 前端按 `agentId` 过滤
- 新建：打开 `CronTaskDialog`（空表单），提交时自动注入 `agentId` 到 `CronTaskInput`
- 编辑：打开 `CronTaskDialog`（填入已有数据），通过 `cron.update` 保存
- 删除：确认后调用 `cron.remove`
- 启停：调用 `cron.update(id, { enabled: !current })`
- 手动执行：调用 `cron.run(id)`
- 列表展示复用 `CronTaskCard` 组件

**理由**：`cron.add/update/remove` 是 Gateway 原生支持的 RPC，不需要走 config.patch。CronTaskDialog 和 CronTaskCard 已有完整实现，直接复用。新建时自动绑定当前 agentId 是最自然的交互。

### 4. 渠道 Tab：只读展示

**方案**：
- 调用 `channels.status` 获取所有渠道状态
- 展示渠道类型、名称、连接状态、配置情况
- 顶部提示文案说明此处为 Gateway 级渠道状态

**理由**：渠道与智能体的绑定关系（bindings）在配置中的结构较复杂（match 规则含 channel、accountId、peer 等），编辑界面设计和验证逻辑工作量大，本期先做只读展示。

### 5. config.patch 的安全策略

**方案**：
- `config.patch` 接受两个参数：`raw`（YAML 字符串）和可选的 `baseHash`
- 使用 `baseHash` 进行乐观并发控制：保存时传入读取时的 hash，如果 config 已被其他客户端修改，Gateway 会拒绝并返回冲突错误
- 编辑时只修改目标 agent 的 `tools` 或 `skills` 字段，不触碰 config 的其他部分
- 写入前需将当前 `config.get` 快照的 `raw` YAML 解析、修改目标字段、重新序列化

**工具**：使用 `yaml` 库（已有 `js-yaml` 或需添加）进行 YAML 解析/序列化，确保不丢失 config 中的注释和格式。

### 6. 数据获取策略：按需加载 + 存入 agents-store

**方案**：在 `agents-store` 中为每个 Tab 增加独立的数据状态和 fetch/save 方法，切换 Tab 或切换 Agent 时触发对应的数据加载。切换 Agent 时清空。

**理由**：与现有 `fetchFiles` 模式一致。

### 7. Adapter 扩展：`toolsCatalog` 和 `skillsStatus` 增加 agentId

**方案**：
- `toolsCatalog(agentId?: string)` — 传递 `{ agentId }` 到 RPC
- `skillsStatus(agentId?: string)` — 传递 `{ agentId }` 到 RPC
- 向后兼容：不传 agentId 时行为不变

## Risks / Trade-offs

- **[config.patch 并发冲突]** → 使用 `baseHash` 乐观锁缓解；冲突时提示用户重新加载后再试
- **[YAML 序列化可能丢失注释]** → 如果 `config.get` 返回 `raw` 字段（原始 YAML），优先基于 raw 修改；否则基于 JSON 序列化
- **[渠道无编辑能力]** → 本期只做展示，后续需要设计 bindings 编辑界面
- **[定时任务前端过滤]** → 任务通常 < 50 个，前端过滤性能无问题
- **[工具策略编辑的复杂度]** → 内置 UI 的工具编辑有 profile + 单工具 checkbox 两种模式，本期先实现 profile 和 allow/deny 编辑，单工具 checkbox 可后续迭代
