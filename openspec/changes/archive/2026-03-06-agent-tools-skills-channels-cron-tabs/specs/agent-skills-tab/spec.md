## ADDED Requirements

### Requirement: 展示智能体技能列表
当用户切换到技能 Tab 时，系统 SHALL 调用 `skills.status` (传入当前 `agentId`) 获取该智能体的技能状态列表。

每个技能项 SHALL 展示：
- 图标 (icon/emoji)
- 名称 (name)
- 描述 (description)
- 启用状态 (enabled / disabled / blocked by allowlist)
- 来源标签 (built-in / workspace)
- 缺失依赖提示 (missing bins / env)

#### Scenario: 成功加载技能列表
- **WHEN** 用户在智能体详情页切换到"技能" Tab
- **THEN** 系统调用 `skills.status` (agentId=当前选中智能体ID)，展示技能列表

#### Scenario: 技能列表为空
- **WHEN** 该智能体没有可用技能
- **THEN** 展示空状态提示

#### Scenario: 技能被白名单阻止
- **WHEN** 某技能的 `blockedByAllowlist` 为 true
- **THEN** 该技能项 SHALL 展示"被技能白名单限制"的状态标签

#### Scenario: 技能缺失依赖
- **WHEN** 某技能的 `missing.bins` 或 `missing.env` 非空
- **THEN** 该技能项 SHALL 展示缺失依赖的警告提示

### Requirement: 展示技能统计摘要
技能 Tab 顶部 SHALL 展示技能统计摘要：
- 总技能数
- 启用数量
- 被限制数量

#### Scenario: 摘要信息
- **WHEN** 技能数据加载完成
- **THEN** 展示统计摘要卡片

### Requirement: 编辑技能白名单
系统 SHALL 支持编辑当前智能体的技能白名单（`agents.list[].skills`），提供两种模式：

1. **使用全部技能**（skills 字段省略/undefined）：所有技能均可用
2. **仅使用选中的技能**（skills 字段为 `["skill-slug-a", "skill-slug-b", ...]`）：只有白名单中的技能可用

用户通过模式切换和 checkbox 列表编辑白名单，保存时通过 `config.patch` 写入。

#### Scenario: 当前为"使用全部技能"模式
- **WHEN** 当前智能体的 skills 字段为 undefined 或不存在
- **THEN** 展示"使用全部技能"模式标识，所有技能 checkbox 为选中状态（灰色不可编辑）

#### Scenario: 切换到"仅使用选中的技能"模式
- **WHEN** 用户切换模式为"仅使用选中的技能"
- **THEN** 所有技能 checkbox 变为可编辑，默认全部选中

#### Scenario: 通过 checkbox 编辑白名单
- **WHEN** 用户在"仅使用选中的技能"模式下勾选/取消勾选技能
- **THEN** 本地白名单列表更新，保存按钮变为可用

#### Scenario: 保存技能白名单成功
- **WHEN** 用户点击保存按钮
- **THEN** 系统通过 `config.patch` 将修改后的 skills 白名单写入 `agents.list[].skills`，展示成功提示

#### Scenario: 保存失败
- **WHEN** `config.patch` 返回错误
- **THEN** 展示错误提示

### Requirement: 支持刷新
技能 Tab SHALL 提供刷新按钮。

#### Scenario: 点击刷新
- **WHEN** 用户点击刷新按钮
- **THEN** 重新调用 `skills.status` 和 `config.get`，展示最新数据
