## MODIFIED Requirements

### Requirement: Agent 状态管理

系统 SHALL 使用 Zustand + Immer 管理所有 VisualAgent 的状态，支持高频增量更新。新增 lounge zone 分配、配置驱动的工位数、会议室自动迁移逻辑。

#### Scenario: 初始化 Agent 列表

- **WHEN** 从 RPC `agents.list` 获取到 Agent 配置列表
- **THEN** 系统 SHALL 为每个 Agent 创建 VisualAgent 对象，初始状态为 `"idle"`，使用 `agent.identity.name` 或 `agent.name` 或 `agent.id` 作为显示名称，使用 agentId 生成确定性 avatar 颜色

#### Scenario: 处理 Agent 状态变更事件

- **WHEN** 事件处理模块推送状态变更
- **THEN** store SHALL 更新对应 VisualAgent 的 `status`、`currentTool`、`speechBubble`、`lastActiveAt` 等字段，且 MUST 使用 immer 确保不可变更新

#### Scenario: sub-agent 创建时分配到休息区

- **WHEN** `addSubAgent` 被调用且 sub-agent 初始状态为 idle
- **THEN** 系统 SHALL 将该 Agent 的 zone 设为 `"lounge"`，position 设为休息区的下一个可用锚点

#### Scenario: sub-agent 激活时迁移到热工位区

- **WHEN** sub-agent 状态从 idle 变为 thinking/tool_calling/speaking
- **THEN** 系统 SHALL 将该 Agent 的 zone 从 `"lounge"` 更新为 `"hotDesk"`，position 更新为热工位区的下一个可用工位

#### Scenario: Agent 选中/取消选中

- **WHEN** 用户点击 Agent 圆点或列表项
- **THEN** `selectedAgentId` SHALL 更新为对应 id（再次点击同一 Agent 取消选中设为 null）

### Requirement: 协作关系维护

系统 SHALL 追踪 Agent 之间的协作关系，并在 agentToAgent 通信时自动触发会议区聚集。

#### Scenario: CollaborationLink 更新后触发会议检测

- **WHEN** `updateCollaborationLinks` 更新了 CollaborationLink
- **AND** `agentToAgentConfig.enabled === true`
- **THEN** 系统 SHALL 调用 `detectMeetingGroups` + `applyMeetingGathering`，将符合条件的 Agent 组移入会议区

#### Scenario: 通信结束后 Agent 返回原 zone

- **WHEN** CollaborationLink 过期（>60 秒无活动）或 strength 低于阈值
- **THEN** 系统 SHALL 调用 `returnFromMeeting` 将 Agent 恢复到 originalPosition

## ADDED Requirements

### Requirement: 配置状态字段

office-store SHALL 新增配置驱动的状态字段。

#### Scenario: maxSubAgents 字段

- **WHEN** store 初始化
- **THEN** store SHALL 包含 `maxSubAgents: number`（默认值 8）和 `setMaxSubAgents` action

#### Scenario: agentToAgentConfig 字段

- **WHEN** store 初始化
- **THEN** store SHALL 包含 `agentToAgentConfig: { enabled: boolean; allow: string[] }`（默认 `{ enabled: false, allow: [] }`）和 `setAgentToAgentConfig` action

### Requirement: Zone 迁移 debounce

系统 SHALL 对 sub-agent 的 zone 迁移应用防抖逻辑。

#### Scenario: idle → lounge 迁移防抖

- **WHEN** sub-agent 在热工位区变为 idle
- **THEN** 系统 SHALL 等待 30 秒持续 idle 后才迁移到 lounge，中间如有状态变化则取消迁移

#### Scenario: lounge → hotDesk 迁移防抖

- **WHEN** 休息区 sub-agent 状态变为活跃
- **THEN** 系统 SHALL 等待 500ms 确认状态稳定后执行迁移
