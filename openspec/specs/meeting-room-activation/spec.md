## ADDED Requirements

### Requirement: agentToAgent 通信触发会议区聚集

系统 SHALL 在检测到 agentToAgent 通信时，自动将参与通信的 Agent 移入会议区，通信线在会议区渲染。

#### Scenario: CollaborationLink 触发会议聚集

- **WHEN** 两个或更多 Agent 之间的 CollaborationLink strength 超过 0.3 且 `agentToAgentConfig.enabled === true`
- **THEN** 系统 SHALL 调用 `applyMeetingGathering` 将这些 Agent 移入会议区

#### Scenario: 仅允许配置中的 Agent 触发会议

- **WHEN** Agent A 和 Agent B 之间有 CollaborationLink
- **AND** Agent A 或 Agent B 不在 `agentToAgentConfig.allow` 列表中
- **THEN** 系统 SHALL NOT 将它们移入会议区，通信线保留在原 zone 渲染

#### Scenario: agentToAgent 未启用时不激活会议区

- **WHEN** `agentToAgentConfig.enabled === false`
- **THEN** 系统 SHALL NOT 触发任何会议区聚集，CollaborationLink 在 Agent 原 zone 渲染

### Requirement: 会议结束后 Agent 返回原 zone

系统 SHALL 在通信结束（CollaborationLink 衰减或消失）后，将 Agent 从会议区返回到其 originalPosition 和原 zone。

#### Scenario: 通信结束自动返回

- **WHEN** 会议组的所有 CollaborationLink strength 降至 0.3 以下或链接过期（60 秒超时）
- **THEN** 系统 SHALL 调用 `returnFromMeeting` 将 Agent 恢复到 originalPosition 和原始 zone

#### Scenario: 并发会议支持

- **WHEN** 同时存在多组 agentToAgent 通信
- **THEN** 系统 SHALL 支持最多 3 个并发会议组（`MAX_CONCURRENT_MEETINGS`），每组使用不同的会议桌位置

### Requirement: 会议区通信线渲染

系统 SHALL 在会议区渲染参与通信的 Agent 之间的 ConnectionLine。

#### Scenario: 通信线使用会议区座位坐标

- **WHEN** Agent 已被移入会议区
- **THEN** ConnectionLine 的端点坐标 SHALL 使用 Agent 在会议区的 position（由 `moveToMeeting` 更新），而非原始 desk/hotDesk position

#### Scenario: 会议区 Agent 头像和气泡

- **WHEN** Agent 在会议区
- **THEN** AgentAvatar SHALL 在会议座位位置渲染，SpeechBubble SHALL 跟随会议区位置显示

### Requirement: 自动触发频率控制

系统 SHALL 控制 `applyMeetingGathering` 的调用频率，避免性能问题。

#### Scenario: 无变化时跳过

- **WHEN** `detectMeetingGroups` 的结果与上次相同
- **THEN** 系统 SHALL 跳过 `applyMeetingGathering` 调用

#### Scenario: 最大触发频率

- **WHEN** CollaborationLink 高频更新
- **THEN** `applyMeetingGathering` SHALL 不超过每秒 2 次调用（throttle 500ms）
