## ADDED Requirements

### Requirement: 展示智能体工具目录
当用户切换到工具 Tab 时，系统 SHALL 调用 `tools.catalog` (传入当前 `agentId`) 获取该智能体可用的工具列表，并按来源分组展示。

每个工具项 SHALL 展示：
- 工具名称 (name)
- 工具描述 (description)
- 来源标签 (source: built-in / plugin / workspace)

#### Scenario: 成功加载工具列表
- **WHEN** 用户在智能体详情页切换到"工具" Tab
- **THEN** 系统调用 `tools.catalog` (agentId=当前选中智能体ID)，展示工具列表按来源分组排列

#### Scenario: 工具列表为空
- **WHEN** 该智能体没有可用工具（`tools.catalog` 返回空数组）
- **THEN** 展示空状态提示"该智能体未配置工具策略"

#### Scenario: 加载失败
- **WHEN** RPC 调用失败
- **THEN** 展示错误提示，并提供重试按钮

### Requirement: 展示工具策略摘要
工具 Tab 顶部 SHALL 展示当前智能体的工具策略摘要信息，包括：
- 当前 profile（如 full / minimal / custom 等）
- 启用工具数量 / 总工具数量
- 如果有 alsoAllow/deny 列表，展示概要说明

策略信息从 `config.get` 快照中 `agents.list[].tools` 提取。

#### Scenario: 有工具策略配置
- **WHEN** `config.get` 快照中当前智能体的 `tools` 字段存在
- **THEN** 展示策略摘要卡片，包含 profile 名称和启用数量

#### Scenario: 无工具策略配置
- **WHEN** 当前智能体无 `tools` 配置
- **THEN** 展示默认提示"使用默认工具策略（full）"

### Requirement: 编辑工具策略
系统 SHALL 支持编辑当前智能体的工具策略，包括：
- **Profile 切换**：下拉选择预设策略（full / minimal / custom 等）
- **alsoAllow 编辑**：输入/选择额外允许的工具名称列表
- **deny 编辑**：输入/选择明确禁止的工具名称列表

编辑后通过"保存"按钮触发 `config.patch`，将修改写入 `agents.list[].tools`。

#### Scenario: 切换 profile
- **WHEN** 用户从 profile 下拉中选择新值（如从 full 切换到 minimal）
- **THEN** 本地状态更新为新 profile 值，保存按钮变为可用

#### Scenario: 编辑 alsoAllow 列表
- **WHEN** 用户在 alsoAllow 输入中添加或移除工具名称
- **THEN** 本地状态更新，保存按钮变为可用

#### Scenario: 保存工具策略成功
- **WHEN** 用户点击保存按钮
- **THEN** 系统通过 `config.patch` 将修改后的 tools 配置写入，展示成功提示，并刷新工具列表

#### Scenario: 保存失败（并发冲突）
- **WHEN** `config.patch` 返回冲突错误（config 已被其他客户端修改）
- **THEN** 展示冲突提示，建议用户重新加载后再试

### Requirement: 支持刷新
工具 Tab SHALL 提供刷新按钮，用户点击后重新加载工具数据和策略配置。

#### Scenario: 点击刷新
- **WHEN** 用户点击刷新按钮
- **THEN** 重新调用 `tools.catalog` 和 `config.get`，展示最新数据
