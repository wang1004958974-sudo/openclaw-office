## ADDED Requirements

### Requirement: 2.5D 拟人化角色组件

系统 SHALL 提供 `AgentCharacter2D5` 组件，渲染一个 34×34px 的拟人化小人。角色 SHALL 包含以下子元素（从上到下）：

- **名称标签（tag）**——角色上方居中，10px 字号，胶囊形半透明背景，`translateZ` 浮于顶层
- **头部（head）**——14×14px 圆形，肤色填充，内阴影模拟面部轮廓
- **身体（body）**——22×22px 圆角矩形（12px 顶部圆角），蓝色渐变填充（`#7dd5ff` → `#5c8dff`），带外发光和投影
- **投影阴影（shadow）**——底部椭圆，模糊 4px，黑色半透明，提供地面感

角色容器 SHALL 使用 `position: absolute` 放置在等距空间中，`translateZ(18px)` 悬浮于工位桌面之上。

#### Scenario: 角色正确渲染
- **WHEN** 对应 Agent 存在于 ProjectionStore 中
- **THEN** 角色 SHALL 在对应工位附近渲染，显示名称标签、头部、身体和投影阴影

#### Scenario: 角色层级正确
- **WHEN** 角色与工位同时渲染
- **THEN** 角色 SHALL 视觉上位于工位桌面之上（通过 translateZ 层级控制）

### Requirement: 角色空闲呼吸动画

系统 SHALL 在 Agent 处于 IDLE 状态时为角色添加呼吸动画——微缩放（scale 0.98 → 1.02）循环，周期 3-4 秒。呼吸动画 SHALL 节制克制，幅度极小，不喧宾夺主。

#### Scenario: 空闲呼吸
- **WHEN** Agent 状态为 IDLE
- **THEN** 角色 SHALL 播放微缩放呼吸动画，循环不停

#### Scenario: 工作时停止呼吸
- **WHEN** Agent 状态从 IDLE 切换到 WORKING
- **THEN** 呼吸动画 SHALL 停止，角色保持静止

### Requirement: 角色工作状态视觉

系统 SHALL 在 Agent 处于 WORKING 状态时将角色亮度轻微提升（`filter: brightness(1.05)`），身体发光增强，表达专注感。TOOL_CALL 状态 SHALL 在此基础上添加 opacity 波动（0.85-1.0，0.8 秒周期），表达"正在调用外部系统"。

#### Scenario: 工作中视觉
- **WHEN** Agent 状态为 WORKING
- **THEN** 角色 SHALL 亮度提升，身体发光增强

#### Scenario: 工具调用视觉
- **WHEN** Agent 状态为 TOOL_CALL
- **THEN** 角色 SHALL 在亮度提升基础上添加 opacity 微闪效果

### Requirement: 角色阻塞状态视觉

系统 SHALL 在 Agent 处于 BLOCKED 状态时为角色添加红色光罩——身体颜色叠加红色调（`filter: hue-rotate(180deg)` 或 CSS `mix-blend-mode`），同时保持静止不动，表达"卡住了"。

#### Scenario: 阻塞视觉
- **WHEN** Agent 状态为 BLOCKED
- **THEN** 角色 SHALL 呈现红色调，静止不动，持续至少 4 秒

### Requirement: Sub-agent 临时角色

系统 SHALL 提供 `SubAgentGhost` 组件渲染临时协作者。与正式角色相比：
- 整体透明度降低（opacity 0.7）
- 标签标注"临时"前缀
- 只出现在项目室区域的预定坐标
- 带淡入动画（opacity 0→0.7 + scale 0.8→1.0，0.5 秒）
- 任务完成后淡出消失（opacity 0.7→0 + scale 1.0→0.8，0.5 秒）
- 最多同时显示 3 个

#### Scenario: Sub-agent 出现
- **WHEN** 感知引擎输出 `SPAWN_SUBAGENT` 事件
- **THEN** 项目室区域 SHALL 淡入一个临时角色，带"临时"标签

#### Scenario: Sub-agent 消失
- **WHEN** 感知引擎输出协作完成事件
- **THEN** 临时角色 SHALL 淡出消失

#### Scenario: Sub-agent 数量上限
- **WHEN** 已有 3 个临时角色在项目室
- **THEN** 第 4 个 sub-agent SHALL 仅在面板列表中显示，不额外渲染角色
