## ADDED Requirements

### Requirement: 从 Gateway 获取 subagents 配置

系统 SHALL 在 WebSocket 连接成功后，尝试从 Gateway 获取 sub-agent 相关配置参数。

#### Scenario: 成功获取 maxSubAgents

- **WHEN** WebSocket 连接状态为 `connected`
- **AND** Gateway 支持 `config.get` RPC
- **THEN** 系统 SHALL 获取 `agents.defaults.subagents.maxConcurrent` 并存入 store 的 `maxSubAgents` 字段

#### Scenario: Gateway 不支持 config.get

- **WHEN** `config.get` RPC 调用失败（版本不支持或权限不足）
- **THEN** 系统 SHALL 使用默认值 `maxSubAgents = 8`，不影响其他功能

#### Scenario: 配置值合理性校验

- **WHEN** 获取到的 `maxConcurrent` 值超出合理范围（<1 或 >50）
- **THEN** 系统 SHALL 忽略该值，使用默认值 8

### Requirement: 从 Gateway 获取 agentToAgent 配置

系统 SHALL 在 WebSocket 连接成功后，尝试从 Gateway 获取 agentToAgent 工具配置。

#### Scenario: 成功获取 agentToAgent 配置

- **WHEN** Gateway 支持 `config.get` RPC
- **THEN** 系统 SHALL 获取 `tools.agentToAgent.enabled` 和 `tools.agentToAgent.allow` 并存入 store 的 `agentToAgentConfig` 字段

#### Scenario: 配置不可用时默认禁用

- **WHEN** `config.get` 不可用或未返回 agentToAgent 配置
- **THEN** 系统 SHALL 使用默认值 `{ enabled: false, allow: [] }`

### Requirement: Store 配置状态管理

office-store SHALL 新增配置相关的状态字段和更新 action。

#### Scenario: maxSubAgents 状态字段

- **WHEN** store 初始化
- **THEN** `maxSubAgents` SHALL 初始值为 8，可通过 `setMaxSubAgents(n)` action 更新

#### Scenario: agentToAgentConfig 状态字段

- **WHEN** store 初始化
- **THEN** `agentToAgentConfig` SHALL 初始值为 `{ enabled: false, allow: [] }`，可通过 `setAgentToAgentConfig(config)` action 更新

#### Scenario: Mock 模式可配置

- **WHEN** 运行在 Mock 模式（`VITE_MOCK=true`）
- **THEN** mock-adapter SHALL 提供可配置的 `maxSubAgents` 和 `agentToAgentConfig` 值
