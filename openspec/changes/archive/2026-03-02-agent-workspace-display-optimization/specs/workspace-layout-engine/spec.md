## ADDED Requirements

### Requirement: 横向优先填充算法

工位布局引擎 SHALL 采用「先横向后纵向」策略，在可用宽度内优先横向填充列，当一行占满后再向下扩展行。

#### Scenario: 热工位区默认 4 列布局

- **WHEN** 热工位区有 1-4 个 sub-agent
- **THEN** 系统 SHALL 使用 4 列布局，所有 Agent 排在第一行

#### Scenario: 热工位区超过 4 个 agent 时向下扩展

- **WHEN** 热工位区有 5-8 个 sub-agent
- **THEN** 系统 SHALL 保持 4 列，新增 Agent 排在第二行

#### Scenario: 固定工位区同样先横向填充

- **WHEN** 固定工位区有 1-4 个主 Agent
- **THEN** 系统 SHALL 使用 4 列布局，主 Agent 先横向排列

#### Scenario: 列数受区域物理宽度限制

- **WHEN** 区域可用宽度不足以容纳 4 列 DeskUnit（每列最小宽度 100px）
- **THEN** 系统 SHALL 自动减少列数至 `floor(availableWidth / 100)`

### Requirement: 基于配置的工位预分配

系统 SHALL 根据配置的最大 sub-agent 数量预先分配热工位区的工位总数，而非仅根据当前活跃 Agent 数量。

#### Scenario: 工位数等于配置的 maxSubAgents

- **WHEN** 系统从配置获取到 `maxSubAgents = 12`
- **THEN** 热工位区 SHALL 预渲染 12 个工位（空工位显示为空桌子），无论当前有多少活跃 sub-agent

#### Scenario: 配置不可用时使用默认值

- **WHEN** 无法从 Gateway 获取 maxSubAgents 配置
- **THEN** 系统 SHALL 使用默认值 8 作为工位预分配数量

#### Scenario: 固定工位区预分配

- **WHEN** 系统初始化固定工位区
- **THEN** 工位数 SHALL 为 `Math.max(主Agent数, 4)`，确保至少 4 个空工位可见

### Requirement: 自适应列数计算

`adaptiveCols` 函数 SHALL 基于区域物理宽度和最小工位宽度动态计算最大列数。

#### Scenario: 计算可容纳的最大列数

- **WHEN** 给定区域宽度和 padding
- **THEN** 最大列数 SHALL 为 `floor((zoneWidth - 2 * padX) / MIN_DESK_WIDTH)`，其中 `MIN_DESK_WIDTH = 100`

#### Scenario: 实际列数取最大列数和工位数的较小值

- **WHEN** 工位数量少于最大列数
- **THEN** 实际列数 SHALL 为 `min(maxCols, slotCount)`，避免出现过多空列
