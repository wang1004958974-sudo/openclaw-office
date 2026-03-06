## 1. Gateway Adapter 扩展

- [x] 1.1 更新 `ToolCatalogEntry` 类型（`adapter-types.ts`），增加 `source`、`group`、`optional`、`enabled` 可选字段
- [x] 1.2 更新 `GatewayAdapter` 接口（`adapter.ts`），将 `toolsCatalog` 签名改为 `toolsCatalog(agentId?: string)`
- [x] 1.3 更新 `GatewayAdapter` 接口，将 `skillsStatus` 签名改为 `skillsStatus(agentId?: string)`
- [x] 1.4 更新 `WsAdapter` 实现（`ws-adapter.ts`），`toolsCatalog` 传递可选 `agentId` 到 RPC params
- [x] 1.5 更新 `WsAdapter` 实现，`skillsStatus` 传递可选 `agentId` 到 RPC params
- [x] 1.6 更新 `MockAdapter`（`mock-adapter.ts`），为 `toolsCatalog` 和 `skillsStatus` 适配新签名

## 2. Config Patch 工具函数

- [x] 2.1 创建 `src/lib/config-patch-helpers.ts`，实现从 config 快照中提取指定 agent 的 tools/skills 配置
- [x] 2.2 实现 `patchAgentToolsConfig` 函数：构造仅修改 `agents.list[].tools` 的 config.patch 请求
- [x] 2.3 实现 `patchAgentSkillsConfig` 函数：构造仅修改 `agents.list[].skills` 的 config.patch 请求
- [x] 2.4 处理 baseHash 乐观并发控制逻辑

## 3. agents-store 扩展

- [x] 3.1 在 `AgentsStoreState` 中增加工具 Tab 数据状态：`agentTools`、`agentToolsLoading`、`agentToolsConfig`（含 profile/alsoAllow/deny）、`configHash`
- [x] 3.2 在 `AgentsStoreState` 中增加技能 Tab 数据状态：`agentSkills`、`agentSkillsLoading`、`agentSkillsAllowlist`（string[] | null）
- [x] 3.3 在 `AgentsStoreState` 中增加渠道 Tab 数据状态：`agentChannels`、`agentChannelsLoading`
- [x] 3.4 在 `AgentsStoreState` 中增加定时任务 Tab 数据状态：`agentCronJobs`、`agentCronJobsLoading`、`cronDialogOpen`、`cronEditingTask`
- [x] 3.5 实现 `fetchAgentTools(agentId)` action：调用 `toolsCatalog(agentId)` + 从 `config.get` 提取工具策略
- [x] 3.6 实现 `saveAgentToolsConfig(agentId, toolsConfig)` action：通过 `config.patch` 保存工具策略
- [x] 3.7 实现 `fetchAgentSkills(agentId)` action：调用 `skillsStatus(agentId)` + 从 `config.get` 提取技能白名单
- [x] 3.8 实现 `saveAgentSkillsAllowlist(agentId, skills)` action：通过 `config.patch` 保存技能白名单
- [x] 3.9 实现 `fetchAgentChannels()` action：调用 `channelsStatus()`
- [x] 3.10 实现 `fetchAgentCronJobs(agentId)` action：调用 `cronList()` 并按 `agentId` 过滤
- [x] 3.11 实现定时任务 CRUD actions：`addAgentCronJob`、`updateAgentCronJob`、`removeAgentCronJob`、`runAgentCronJob`、`toggleAgentCronJob`
- [x] 3.12 实现 `openAgentCronDialog`、`closeAgentCronDialog` actions
- [x] 3.13 在 `selectAgent` action 中清空四个 Tab 的数据状态

## 4. ToolsTab 组件实现

- [x] 4.1 重写 `ToolsTab` 组件，接收 `agent` prop，在 mount 时调用 `fetchAgentTools`
- [x] 4.2 实现工具策略摘要卡片（profile、启用数量）
- [x] 4.3 实现 profile 下拉选择编辑（full / minimal / custom）
- [x] 4.4 实现 alsoAllow 列表编辑（添加/移除工具名称）
- [x] 4.5 实现 deny 列表编辑（添加/移除工具名称）
- [x] 4.6 实现保存按钮，调用 `saveAgentToolsConfig`，展示保存状态反馈
- [x] 4.7 实现工具列表按 source 分组展示（built-in / plugin / workspace）
- [x] 4.8 实现加载态、空状态、错误态
- [x] 4.9 实现刷新按钮

## 5. SkillsTab 组件实现

- [x] 5.1 重写 `SkillsTab` 组件，接收 `agent` prop，在 mount 时调用 `fetchAgentSkills`
- [x] 5.2 实现技能统计摘要（总数/启用/被限制）
- [x] 5.3 实现技能列表展示（图标、名称、描述、启用状态、来源、缺失依赖提示）
- [x] 5.4 实现模式切换："使用全部技能" vs "仅使用选中的技能"
- [x] 5.5 实现 checkbox 白名单编辑（在"仅使用选中的技能"模式下）
- [x] 5.6 实现保存按钮，调用 `saveAgentSkillsAllowlist`，展示保存状态反馈
- [x] 5.7 实现加载态、空状态
- [x] 5.8 实现刷新按钮

## 6. ChannelsTab 组件实现

- [x] 6.1 重写 `ChannelsTab` 组件，接收 `agent` prop，在 mount 时调用 `fetchAgentChannels`
- [x] 6.2 实现 Gateway 级渠道说明文案
- [x] 6.3 实现渠道状态卡片列表（类型图标、名称、连接状态、配置状态）
- [x] 6.4 实现加载态、空状态
- [x] 6.5 实现刷新按钮

## 7. CronJobsTab 组件实现

- [x] 7.1 重写 `CronJobsTab` 组件，接收 `agent` prop，在 mount 时调用 `fetchAgentCronJobs`
- [x] 7.2 实现任务统计摘要（总数/启用/错误数）
- [x] 7.3 实现任务列表展示，复用 `CronTaskCard` 组件
- [x] 7.4 实现"新建定时任务"按钮，打开 `CronTaskDialog`
- [x] 7.5 实现 CronTaskDialog 的 onSave 回调：自动注入 agentId 调用 `addAgentCronJob`
- [x] 7.6 实现编辑回调：调用 `updateAgentCronJob`
- [x] 7.7 实现删除回调：调用 `removeAgentCronJob`
- [x] 7.8 实现启停回调：调用 `toggleAgentCronJob`
- [x] 7.9 实现手动执行回调：调用 `runAgentCronJob`
- [x] 7.10 实现加载态、空状态
- [x] 7.11 实现刷新按钮

## 8. AgentDetailTabs 适配

- [x] 8.1 更新 `AgentDetailTabs.tsx`，将 `agent` prop 传递给 ToolsTab、SkillsTab、ChannelsTab、CronJobsTab

## 9. i18n 补全

- [x] 9.1 补充中文翻译 key（`locales/zh/console.json`）：工具 Tab 的策略编辑、保存反馈等文案
- [x] 9.2 补充中文翻译 key：技能 Tab 的白名单模式切换、保存反馈等文案
- [x] 9.3 补充中文翻译 key：渠道 Tab 的说明文案
- [x] 9.4 补充中文翻译 key：定时任务 Tab 的新建/统计等文案
- [x] 9.5 补充英文翻译 key（`locales/en/console.json`）：对应所有中文 key 的英文翻译
