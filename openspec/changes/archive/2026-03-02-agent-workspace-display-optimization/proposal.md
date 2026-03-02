## Why

当前 Office 2D/3D 可视化在多 Agent 协同场景下存在三个核心问题：

1. **工位布局策略不合理**：热工位区 `adaptiveCols` 在 ≤8 个 Agent 时固定 2 列，导致超过 4 个 sub-agent 工作时纵向堆叠拥挤。用户期望先横向占满（至少 4 列），再向下扩展。当前热工位区初始仅显示 `Math.max(hotDeskAgents.length, 2)` 个空工位，无法预览配置的最大 sub-agent 容量。
2. **休息区未被利用**：`lounge` 区域仅有装饰性家具（沙发、咖啡杯），AgentZone 虽定义了 `"lounge"` 但从未分配 Agent。用户期望休息区动态显示当前空闲的 sub-agent，当工作开始后 Agent 从休息区"走向"热工作区，形成 `热工位数 + 休息区数 = 配置最大 sub-agent 数` 的动态平衡。
3. **会议室未接入 agentToAgent 通信**：`applyMeetingGathering` 仅在测试中使用，生产代码未调用。用户已配置 `tools.agentToAgent.enabled: true, allow: ["main", "coder", "ai-researcher", "ecommerce"]`，但 Agent 间通信的 CollaborationLink 仍在热工位区渲染，未利用会议区可视化。

用户的 OpenClaw 配置显示 `subagents.maxConcurrent: 12, maxSpawnDepth: 2`，有 4 个主 Agent（main、coder、ai-researcher、ecommerce）均启用 agentToAgent。此变更将充分展现多 Agent 协同工作的视觉效果。

## What Changes

- **工位布局算法重构**：修改 `adaptiveCols` 策略，热工位区优先横向扩展（默认 4 列），当横向占满再向下扩展行；固定工位区同理。工位总数根据配置的 `maxConcurrent` 预分配，而非仅按当前活跃 Agent 数量。
- **休息区 Agent 动态显示**：空闲 sub-agent 显示在休息区（沙发旁或专用休息座位），工作开始后动态"移动"至热工位区。热工位区数量 + 休息区数量 = 配置 `maxSubAgents`。
- **会议室 agentToAgent 通信接入**：将 `applyMeetingGathering` 接入生产事件流，当检测到 agentToAgent 通信（通过 CollaborationLink 的 sessionKey 关联）时，相关 Agent 自动移入会议区渲染。
- **配置感知层**：通过 Gateway RPC（`config.get` 或扩展 `agents.list`）获取 `subagents.maxConcurrent` 和 `tools.agentToAgent` 配置，驱动前端布局决策。如 Gateway 暂不支持，使用合理的默认值（maxSubAgents=8）并在 mock 模式中可配置。
- **3D 场景同步**：3D 办公场景通过 `position2dTo3d` 映射已自动跟随 2D 坐标变化，需确保新增的休息区 Agent 位置和会议区移动在 3D 中正确渲染，包括 lerp 平滑过渡动画。

## Capabilities

### New Capabilities

- `workspace-layout-engine`: 工位布局引擎重构——横向优先填充算法、基于配置的工位预分配、自适应列数策略
- `lounge-agent-display`: 休息区 Agent 动态显示——空闲 sub-agent 在休息区可视化、工作时从休息区移至热工位区的过渡动画
- `meeting-room-activation`: 会议室 agentToAgent 通信激活——将 meeting-manager 接入生产事件流、CollaborationLink 驱动的自动 Zone 迁移
- `config-awareness`: 配置感知层——从 Gateway 获取 subagents 限制和 agentToAgent 配置，驱动前端布局

### Modified Capabilities

- `floor-plan-2d`: 四区域布局渲染需支持休息区 Agent 显示和会议室动态激活
- `office-store`: Agent 状态管理需新增 lounge zone 分配、配置驱动的工位数、会议室自动迁移逻辑

## Impact

- **核心修改文件**：
  - `src/lib/position-allocator.ts` — 布局算法重构
  - `src/lib/constants.ts` — 工位网格常量调整
  - `src/components/office-2d/FloorPlan.tsx` — 休息区 Agent 渲染、会议室动态激活
  - `src/store/office-store.ts` — Zone 分配逻辑、配置存储、会议室自动迁移
  - `src/store/meeting-manager.ts` — 接入生产事件流
  - `src/hooks/useSubAgentPoller.ts` — 增加配置获取
  - `src/components/office-3d/OfficeLayout3D.tsx` — 休息区 Agent 3D 渲染
  - `src/components/office-3d/AgentCharacter.tsx` — 确保新 zone 位置的 3D 映射
- **Gateway 依赖**：需确认 `config.get` RPC 是否可用于读取 `agents.defaults.subagents` 和 `tools.agentToAgent`。如暂不可用，先使用前端默认值，后续通过 Gateway 协议扩展对齐。
- **测试影响**：现有 `meeting-manager.test.ts` 和 `subagent-poller` 测试需更新，新增布局算法和 zone 迁移测试。
