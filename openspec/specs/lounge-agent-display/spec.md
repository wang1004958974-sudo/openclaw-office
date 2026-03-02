## ADDED Requirements

### Requirement: 休息区空闲 sub-agent 显示

系统 SHALL 在休息区（Lounge Zone）显示当前处于空闲状态的 sub-agent，形成「热工位活跃数 + 休息区空闲数 = maxSubAgents」的动态平衡。

#### Scenario: 空闲 sub-agent 显示在休息区

- **WHEN** sub-agent 被创建且当前状态为 idle
- **THEN** 该 Agent 的 zone SHALL 为 `"lounge"`，头像 SHALL 渲染在休息区的预设锚点位置（沙发/咖啡桌旁）

#### Scenario: 休息区 Agent 数量与热工位互补

- **WHEN** 热工位区有 N 个活跃 sub-agent
- **THEN** 休息区 SHALL 显示 `maxSubAgents - N` 个空闲 sub-agent 头像（如果已创建足够多的 sub-agent）

#### Scenario: 无 sub-agent 时休息区为空

- **WHEN** 系统中没有任何 sub-agent 被创建
- **THEN** 休息区 SHALL 仅显示装饰性家具，无 Agent 头像

### Requirement: 休息区布局锚点

系统 SHALL 为休息区定义一组固定锚点，用于放置空闲 sub-agent 的头像。

#### Scenario: 锚点分布

- **WHEN** 休息区需要显示 Agent 头像
- **THEN** 锚点 SHALL 沿现有沙发和咖啡桌分布，最多支持 12 个位置，避免与装饰物重叠

#### Scenario: 锚点分配顺序

- **WHEN** 多个 Agent 在休息区
- **THEN** 系统 SHALL 按 Agent 创建顺序依次分配锚点，后创建的 Agent 使用后续锚点

### Requirement: 工作时从休息区移至热工位区

系统 SHALL 在 sub-agent 从 idle 变为活跃状态时，将其 zone 从 `"lounge"` 迁移到 `"hotDesk"`。

#### Scenario: 状态变化触发 zone 迁移

- **WHEN** 休息区的 sub-agent 状态变为 `thinking`、`tool_calling`、`speaking` 或 `working`
- **THEN** 系统 SHALL 将该 Agent 的 zone 更新为 `"hotDesk"`，position 更新为热工位区的下一个可用工位

#### Scenario: 迁移伴随视觉过渡

- **WHEN** Agent 从休息区迁移到热工位区
- **THEN** 在 2D 中 position 变化 SHALL 在下一帧生效（SVG 重渲染），在 3D 中 SHALL 使用 lerp 平滑过渡（已有机制）

### Requirement: 长时间 idle 回归休息区

系统 SHALL 在 sub-agent 持续 idle 超过阈值时，将其从热工位区迁回休息区。

#### Scenario: 持续 idle 触发回迁

- **WHEN** 热工位区的 sub-agent 持续 idle 超过 30 秒
- **THEN** 系统 SHALL 将该 Agent 的 zone 更新为 `"lounge"`

#### Scenario: 防抖机制避免频繁迁移

- **WHEN** sub-agent 状态在 idle 和 working 之间快速切换（<500ms）
- **THEN** 系统 SHALL NOT 触发 zone 迁移，仅在状态稳定 500ms 后执行迁移
