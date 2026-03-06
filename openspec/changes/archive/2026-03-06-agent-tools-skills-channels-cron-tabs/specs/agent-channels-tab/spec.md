## ADDED Requirements

### Requirement: 展示 Gateway 级渠道状态
当用户切换到渠道 Tab 时，系统 SHALL 调用 `channels.status` 获取所有渠道状态列表。

每个渠道项 SHALL 展示：
- 渠道类型图标
- 渠道名称 (name)
- 连接状态 (connected / disconnected / connecting / error)
- 配置状态 (configured / not configured)

#### Scenario: 成功加载渠道列表
- **WHEN** 用户在智能体详情页切换到"渠道" Tab
- **THEN** 系统调用 `channels.status`，展示所有渠道的状态卡片

#### Scenario: 无渠道配置
- **WHEN** `channels.status` 返回空列表
- **THEN** 展示空状态提示"未配置渠道"

#### Scenario: 加载失败
- **WHEN** RPC 调用失败
- **THEN** 展示错误提示，并提供重试按钮

### Requirement: 渠道 Tab 说明文案
渠道 Tab SHALL 在顶部展示说明文案，告知用户此处展示的是 Gateway 级渠道状态（非智能体绑定），渠道与智能体的绑定关系请在配置文件中管理。

#### Scenario: 展示说明
- **WHEN** 渠道 Tab 加载完成
- **THEN** 顶部展示说明文案

### Requirement: 支持刷新
渠道 Tab SHALL 提供刷新按钮。

#### Scenario: 点击刷新
- **WHEN** 用户点击刷新按钮
- **THEN** 重新调用 `channels.status`，展示最新数据
