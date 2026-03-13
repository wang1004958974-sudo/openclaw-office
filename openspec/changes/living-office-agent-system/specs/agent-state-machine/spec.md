## ADDED Requirements

### Requirement: 11 种可视状态定义

系统 SHALL 定义 Agent 的 11 种可视状态：

| 状态 | 含义 | 视觉表现 |
|------|------|---------|
| IDLE | 空闲等待 | 呼吸动画 + 绿灯 |
| INCOMING | 收到新事务 | 亮度提升 + 微亮工位 |
| ACK | 确认接单 | 点头动画 + 黄灯 |
| WORKING | 处理中 | 静止专注 + 黄灯 + 显示器高亮 |
| TOOL_CALL | 调用工具 | 身体微闪 + 工具图标高亮 |
| WAITING | 等待外部返回 | 慢闪烁 + 黄灯慢闪 |
| COLLABORATING | 协作中 | 移动到项目室/白板 + 多工位联动 |
| RETURNING | 回传结果 | 移动回工位 + 路径线 |
| DONE | 完成 | 短亮反馈 + 绿灯恢复 |
| BLOCKED | 阻塞/错误 | 红色叠加 + 红灯 + 静止 |
| RECOVERED | 恢复 | 红→黄→绿 渐变 |

#### Scenario: 状态到视觉映射完整
- **WHEN** Agent 处于任意一种状态
- **THEN** 系统 SHALL 为该状态提供明确的 CSS class 和视觉表现规则

### Requirement: 状态转换规则

系统 SHALL 定义合法的状态转换路径，非法转换 SHALL 记录警告日志但不崩溃。合法转换：

- IDLE → INCOMING
- INCOMING → ACK
- ACK → WORKING
- WORKING → TOOL_CALL / WAITING / COLLABORATING / DONE / BLOCKED
- TOOL_CALL → WORKING / WAITING / DONE / BLOCKED
- WAITING → WORKING / DONE / BLOCKED
- COLLABORATING → RETURNING / BLOCKED
- RETURNING → DONE
- DONE → IDLE
- BLOCKED → RECOVERED
- RECOVERED → WORKING / IDLE

任何状态 → IDLE 的快速跳转 SHALL 被允许（用于异常恢复）。

#### Scenario: 合法状态转换
- **WHEN** Agent 从 WORKING 状态收到 TOOL_CALL 事件
- **THEN** 状态机 SHALL 转换到 TOOL_CALL 状态

#### Scenario: 非法状态转换降级
- **WHEN** Agent 从 IDLE 直接收到 RETURNING 事件（跳过中间状态）
- **THEN** 状态机 SHALL 记录警告日志，但仍接受转换（不崩溃）

#### Scenario: 快速跳回 IDLE
- **WHEN** 任何状态下收到强制回 IDLE 的指令
- **THEN** 状态机 SHALL 允许直接跳回 IDLE

### Requirement: 状态持续时间控制

系统 SHALL 为每种状态定义建议的最短持续时间（holdMs），状态机 SHALL 与 HoldController 配合，确保视觉状态不被过快覆盖：

| 状态 | 建议持续时间 |
|------|------------|
| INCOMING | 800-1200ms |
| ACK | 1000-1500ms |
| WORKING | 2000-5000ms |
| TOOL_CALL | 1500-4000ms |
| WAITING | 2000-6000ms |
| COLLABORATING | 4000-10000ms |
| RETURNING | 1000-2000ms |
| DONE | 1000-1800ms |
| BLOCKED | 4000-8000ms |
| RECOVERED | 2000-3000ms |

#### Scenario: 阻塞状态充分停留
- **WHEN** Agent 进入 BLOCKED 状态
- **THEN** 该状态 SHALL 保持至少 4 秒，在此期间视觉上持续呈现红色阻塞态

#### Scenario: 完成状态短暂保留
- **WHEN** Agent 进入 DONE 状态
- **THEN** 该状态 SHALL 保持至少 1 秒，让用户能看到"已完成"的反馈，然后自动回退到 IDLE

### Requirement: 状态机纯函数实现

状态机逻辑 SHALL 实现为纯函数 `transition(currentState, event): { nextState, visualInstructions }`，其中 `visualInstructions` 包含 CSS class 列表、是否触发移动、移动目标坐标等信息。纯函数设计确保可测试性和可预测性。

#### Scenario: 状态机可测试
- **WHEN** 输入 `(WORKING, BLOCK_EVENT)`
- **THEN** 函数 SHALL 返回 `{ nextState: BLOCKED, visualInstructions: { cssClass: "blocked", shouldMove: false } }`
