## Why

智能体管理页面（`/agents`）已有工具、技能、渠道、定时任务四个 Tab 的入口，但均为占位组件，没有实际功能。OpenClaw Gateway 已完整支持这四个维度的数据查询和编辑能力，且内置 UI（`ui/`）已实现了对应的完整交互。本次变更旨在将这四个 Tab 从占位状态升级为可用的功能面板，不仅支持展示，还要支持安全可控的编辑操作。

编辑能力遵循现有模型配置的模式：通过 Gateway API（`config.patch`、`cron.add/update/remove` 等）进行持久化修改，不直接修改 OpenClaw 底层源码。

## What Changes

- **ToolsTab**：展示当前智能体的工具目录，展示工具策略摘要（profile），支持通过 `config.patch` 修改工具策略（profile 切换、allow/deny 编辑）
- **SkillsTab**：展示当前智能体可用的技能列表及状态，支持编辑技能白名单（`agents.list[].skills`），通过 checkbox 选择允许/限制哪些技能，通过 `config.patch` 持久化
- **ChannelsTab**：展示 Gateway 级渠道状态列表（只读），渠道绑定关系较复杂，本期仅做展示
- **CronJobsTab**：展示与当前智能体关联的定时任务列表，支持新建/编辑/删除/启停/手动执行定时任务，复用现有 `CronTaskDialog` 配置界面，新建时自动关联当前 `agentId`
- **Gateway Adapter 扩展**：为 `toolsCatalog` 和 `skillsStatus` 增加可选 `agentId` 参数支持
- **agents-store 扩展**：增加四个 Tab 所需的数据状态、fetch/save action
- **i18n 补全**：补充四个 Tab 的中英文翻译 key

## Capabilities

### New Capabilities
- `agent-tools-tab`: 智能体工具 Tab — 展示工具目录 + 编辑工具策略（profile/allow/deny）
- `agent-skills-tab`: 智能体技能 Tab — 展示技能列表 + 编辑技能白名单
- `agent-channels-tab`: 智能体渠道 Tab — 展示 Gateway 级渠道状态（只读）
- `agent-cron-tab`: 智能体定时任务 Tab — 展示 + 完整 CRUD 定时任务

### Modified Capabilities
- `gateway-adapter`: 扩展 `toolsCatalog` 和 `skillsStatus` 方法签名，增加可选 `agentId` 参数

## Impact

- **组件变更**：`src/components/console/agents/tabs/` 下的 ToolsTab、SkillsTab、ChannelsTab、CronJobsTab 从占位升级为完整组件
- **Store 变更**：`src/store/console-stores/agents-store.ts` 增加工具/技能/渠道/定时任务的数据状态和 fetch/save 方法
- **Adapter 变更**：`src/gateway/adapter.ts` 和 `ws-adapter.ts` 中 `toolsCatalog`/`skillsStatus` 方法签名变更
- **Adapter Types 变更**：`src/gateway/adapter-types.ts` 中 `ToolCatalogEntry` 类型增强
- **i18n 变更**：`src/i18n/locales/zh/console.json` 和 `src/i18n/locales/en/console.json` 补充翻译
- **复用已有组件**：`CronTaskDialog`、`CronTaskCard` 在定时任务 Tab 中复用，`SkillCard` 样式在技能 Tab 中参考
- **无破坏性变更**：所有变更均为增量，不影响现有功能
