## MODIFIED Requirements

### Requirement: toolsCatalog 方法支持 agentId 参数
`GatewayAdapter.toolsCatalog` 方法 SHALL 接受可选的 `agentId` 参数。当提供 `agentId` 时，RPC 请求 SHALL 在 params 中传递 `{ agentId }`，Gateway 将返回该智能体可用的工具目录。

方法签名变更：`toolsCatalog(agentId?: string): Promise<ToolCatalog>`

#### Scenario: 不传 agentId（向后兼容）
- **WHEN** 调用 `toolsCatalog()` 不传参数
- **THEN** RPC 请求 `tools.catalog` 不含 `agentId`，返回全局工具目录

#### Scenario: 传入 agentId
- **WHEN** 调用 `toolsCatalog("my-agent")` 传入 agentId
- **THEN** RPC 请求 `tools.catalog` 含 `{ agentId: "my-agent" }`，返回该智能体的工具目录

### Requirement: skillsStatus 方法支持 agentId 参数
`GatewayAdapter.skillsStatus` 方法 SHALL 接受可选的 `agentId` 参数。当提供 `agentId` 时，RPC 请求 SHALL 在 params 中传递 `{ agentId }`。

方法签名变更：`skillsStatus(agentId?: string): Promise<SkillInfo[]>`

#### Scenario: 不传 agentId（向后兼容）
- **WHEN** 调用 `skillsStatus()` 不传参数
- **THEN** RPC 请求 `skills.status` 不含 `agentId`，返回全局技能状态

#### Scenario: 传入 agentId
- **WHEN** 调用 `skillsStatus("my-agent")` 传入 agentId
- **THEN** RPC 请求 `skills.status` 含 `{ agentId: "my-agent" }`，返回该智能体的技能状态

### Requirement: ToolCatalogEntry 类型增强
`ToolCatalogEntry` 类型 SHALL 增加以下可选字段以匹配 Gateway 实际返回：
- `source?: string` — 工具来源 (built-in / plugin / workspace)
- `group?: string` — 工具分组
- `optional?: boolean` — 是否为可选工具
- `enabled?: boolean` — 是否启用

#### Scenario: 类型增强
- **WHEN** `tools.catalog` 返回含 source / group / optional / enabled 字段的工具项
- **THEN** `ToolCatalogEntry` 类型能正确表达这些字段
