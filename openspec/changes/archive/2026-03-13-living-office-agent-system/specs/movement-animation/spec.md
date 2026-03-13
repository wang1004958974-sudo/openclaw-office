## ADDED Requirements

### Requirement: CSS transition 移动系统

系统 SHALL 使用 CSS `transition` 实现 Agent 角色的平滑移动。移动参数：

- 持续时间：650-1000ms（根据距离自适应）
- 缓动函数：`cubic-bezier(.25, .9, .2, 1)`（快起慢停）
- 移动属性：`left` 和 `top`

#### Scenario: 平滑移动
- **WHEN** Agent 被指示移动到新坐标
- **THEN** 角色 SHALL 平滑过渡到目标位置，使用 cubic-bezier 缓动，不产生跳跃

### Requirement: 移动仅限重要事件

系统 SHALL 仅在以下 5 种情况下触发 Agent 角色移动：

1. **接到主线新任务**——从工位走向 Gateway 区域（表示"去前台取活"）
2. **去白板讨论**——从工位走向运营行为板/白板区域
3. **进入项目室协作**——从工位走向项目室区域
4. **回传结果到主线**——从临时位置走回自己的工位
5. **从阻塞切到排障**——IT Agent 走向阻塞的工位

其他所有事件（heartbeat、presence、tool ack、短任务完成等）SHALL 仅在工位本地表达，不触发角色移动。

#### Scenario: 协作触发移动
- **WHEN** 感知引擎输出 `COLLABORATING` 状态变更
- **THEN** Agent 角色 SHALL 从当前工位移动到项目室区域

#### Scenario: heartbeat 不触发移动
- **WHEN** 感知引擎输出 `POLL_HEARTBEAT` 事件
- **THEN** Agent 角色 SHALL 保持原位不动，仅工位灯/状态圈变化

#### Scenario: 移动回工位
- **WHEN** Agent 从协作/阻塞恢复到 DONE 或 IDLE
- **THEN** Agent 角色 SHALL 移动回自己的初始工位坐标

### Requirement: 走路动画效果

系统 SHALL 在 Agent 移动过程中添加走路视觉效果：

- 角色添加 `.walking` CSS class
- 亮度提升（`filter: brightness(1.1)`）
- 身体播放 bob 弹跳动画（Y 轴 ±2px 交替，0.5 秒周期）
- 移动到达后自动移除 `.walking` class

#### Scenario: 走路弹跳
- **WHEN** Agent 角色正在移动中
- **THEN** 身体 SHALL 播放上下弹跳动画，到达后停止

### Requirement: 移动路径线

系统 SHALL 在 Agent 移动时渲染一条从起点到终点的路径线（`PathLine` 组件）。路径线样式：

- 高度 4px
- 蓝色渐变（两头透明、中间明亮）
- 辉光阴影（`box-shadow: 0 0 16px rgba(92,200,255,.45)`）
- 通过计算起终点距离和角度，使用 `width` + `rotate()` + `transform-origin: left center` 绘制
- 显示 1.3 秒后自动消失（opacity transition）
- `translateZ(10px)` 悬浮于地板和工位之间

#### Scenario: 路径线显示
- **WHEN** Agent 开始移动
- **THEN** 起点到终点之间 SHALL 出现蓝色光带路径线

#### Scenario: 路径线消失
- **WHEN** 路径线显示 1.3 秒后
- **THEN** 路径线 SHALL 淡出消失

### Requirement: 并发移动控制

系统 SHALL 限制同一时间最多 2 个 Agent 角色同时移动。当第 3 个 Agent 需要移动时，SHALL 排入等待队列，等待前面的移动完成后再执行。

#### Scenario: 并发限制
- **WHEN** 已有 2 个 Agent 正在移动，第 3 个 Agent 收到移动指令
- **THEN** 第 3 个 Agent 的移动 SHALL 排队等待，直到某个移动完成

### Requirement: 坐标系预定义

系统 SHALL 预定义关键位置的坐标映射表（`POSITION_MAP`），包含：

- 每个 Agent 的初始工位坐标（5 个正式 Agent）
- Gateway 区域中心坐标
- 运营行为板中心坐标
- 项目室内多个 sub-agent 坐标位
- 记忆墙区域中心坐标
- Cron 区域中心坐标

#### Scenario: 坐标可用
- **WHEN** 移动系统需要计算起终点
- **THEN** 系统 SHALL 从 `POSITION_MAP` 读取目标区域坐标，不硬编码
