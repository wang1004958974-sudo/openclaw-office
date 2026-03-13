## Why

让 OpenClaw 作为一家公司"活过来"，最核心的视觉元素是**人**——Agent 角色。当前 2D `AgentAvatar` 只是一个带状态圈的 SVG 圆形头像，3D `AgentCharacter` 是一个胶囊体，都无法传达"员工在办公室里工作"的拟人感。

产品蓝图定义了严格的角色行为规则：
- **走路是昂贵语言**——只有 5 类重要事件值得让角色移动
- **状态机驱动**——11 种可视状态（IDLE → INCOMING → ACK → WORKING → TOOL_CALL → WAITING → COLLABORATING → RETURNING → DONE → BLOCKED → RECOVERED）
- **视觉停留**——每种状态有明确的最短保持时间和特定的视觉表现
- **高频事件不做高频动画**——heartbeat/presence/health 用灯光和状态圈表达，不让角色来回跑

本提案实现 Agent 角色渲染系统、可视状态机和动画引擎，让 2.5D 办公室里的"员工"根据感知层事件做出合理的、有因果的、有节奏的动作。

## What Changes

- **新增 2.5D Agent 角色组件**：拟人化小人（头部 + 身体 + 阴影 + 名称标签），带有行走、呼吸、闪烁等微动效
- **新增 Agent 可视状态机**：11 种状态的有限状态机，驱动角色视觉表现（动作、工位灯、HUD、持续时间）
- **新增移动动画引擎**：基于 CSS `transition` 的平滑移动系统，只在 L3/L4 事件时触发跨区移动
- **新增协作路径线**：Agent 移动时在起点和终点之间绘制光带路径线
- **新增 Sub-agent 临时角色**：在项目室中生成/消失的临时协作者，轻量视觉表现
- **连接感知层**：消费 ProjectionStore 的状态驱动角色行为，消费 HoldController 的节流保护

## Capabilities

### New Capabilities
- `agent-character-2d5`: 2.5D Agent 角色渲染——拟人化小人组件、走路/呼吸/闪烁动效、名称标签
- `agent-state-machine`: Agent 可视状态机——11 种状态的转换规则、视觉映射、最短持续时间
- `movement-animation`: 移动动画引擎——CSS transition 平滑移动、路径线绘制、走路仅限重要事件

### Modified Capabilities

（不修改现有能力，旧 AgentAvatar/AgentCharacter 保持不变）

## Impact

- **新增文件**：`src/components/living-office/characters/` 目录（4-6 个组件文件）+ `src/perception/state-machine.ts`
- **依赖感知层**：消费 `ProjectionStore` 和 `PerceivedEvent`
- **依赖场景引擎**：角色组件放置在 `OfficeStage` 的等距空间内
- **无外部依赖**：纯 CSS transition + React state 实现动画
