## MODIFIED Requirements

### Requirement: SVG 办公室平面图

系统 SHALL 渲染一个 SVG 办公室平面图，使用 `viewBox="0 0 1200 700"` 固定坐标系，包含四个可辨识的功能区域，并增加阴影、圆角和渐变等视觉细节。休息区 SHALL 支持显示空闲 sub-agent 头像，会议区 SHALL 动态激活 agentToAgent 通信。

#### Scenario: 四区域布局渲染

- **WHEN** FloorPlan 组件加载
- **THEN** 系统 SHALL 渲染四个区域：Desk Zone（固定工位区，左上）、Meeting Zone（会议区，右上）、Hot Desk Zone（热工位区，左下）、Lounge Zone（休息区，右下），每个区域 SHALL 有不同的渐变底色、圆角（rx=16）和轻微的阴影效果（feDropShadow）。

#### Scenario: 区域标签可读

- **WHEN** 平面图渲染完成
- **THEN** 每个区域 SHALL 显示中文区域名称（固定工位区 / 会议区 / 热工位区 / 休息区），标签使用半透明毛玻璃背景（或对应的 SVG 滤镜）确保在不同底色上可读，并增加视觉层次感。

#### Scenario: 热工位区工位预渲染

- **WHEN** 系统获取到 maxSubAgents 配置
- **THEN** 热工位区 SHALL 预渲染 `maxSubAgents` 个工位（空桌椅），使用 4 列横向优先布局

#### Scenario: 休息区显示空闲 sub-agent

- **WHEN** 存在 zone 为 `"lounge"` 的 sub-agent
- **THEN** FloorPlan SHALL 在休息区的锚点位置渲染这些 Agent 的头像，与现有装饰物不重叠

#### Scenario: 会议区动态显示通信 Agent

- **WHEN** `applyMeetingGathering` 将 Agent 移入会议区
- **THEN** FloorPlan SHALL 在会议座位位置渲染 Agent 头像，ConnectionLine 使用会议区坐标

## ADDED Requirements

### Requirement: 休息区 Agent 渲染层

FloorPlan SHALL 在休息区装饰层之上增加一个 Agent 渲染层，显示 zone 为 `"lounge"` 的 sub-agent。

#### Scenario: 休息区 Agent 头像渲染

- **WHEN** 休息区有空闲 sub-agent
- **THEN** 系统 SHALL 渲染带状态色的 AgentAvatar 组件（idle 状态绿色），位于预定义的沙发旁锚点

#### Scenario: 休息区 Agent 数量动态变化

- **WHEN** Agent 从休息区移至热工位区
- **THEN** 该 Agent 的头像 SHALL 从休息区消失，空出的锚点供后续 Agent 使用
