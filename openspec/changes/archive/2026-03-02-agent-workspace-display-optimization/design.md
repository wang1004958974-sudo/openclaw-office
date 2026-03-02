## Context

当前 Office 可视化的四个功能区（固定工位区、热工位区、会议区、休息区）中，只有固定工位区和热工位区用于 Agent 显示。

**现状问题：**

1. **热工位区布局**：`adaptiveCols` 在 ≤8 个 agent 时强制 2 列（纵向堆叠），热工位区区域宽度约 537px，每个 DeskUnit 宽 140px，完全可容纳 4 列（4×140=560 ≈ 537-80=457，需微调 padding）。用户配置 `maxConcurrent=12`，但初始只显示 `Math.max(length, 2)` 个工位。
2. **休息区**：`AgentZone` 类型定义了 `"lounge"` 但从未赋值给任何 Agent。区域内仅有静态装饰物。
3. **会议区**：`meeting-manager.ts` 的 `applyMeetingGathering` 完整实现了会议聚集逻辑，但仅在 `meeting-manager.test.ts` 中调用，生产代码中无任何调用点。CollaborationLink 驱动的通信线在热工位区原地渲染。
4. **配置盲区**：前端无法获取 `agents.defaults.subagents.maxConcurrent`（默认 8）和 `tools.agentToAgent`。Gateway 的 `agents.list` RPC 只返回 `{id, name, identity}`。

**用户实际配置（~/.openclaw/openclaw.json）：**
- `agents.defaults.maxConcurrent: 6`
- `agents.defaults.subagents.maxConcurrent: 12`
- `agents.defaults.subagents.maxSpawnDepth: 2`
- `tools.agentToAgent.enabled: true, allow: ["main", "coder", "ai-researcher", "ecommerce"]`
- 4 个主 Agent：main、coder(CodeClaw)、ai-researcher(ResearchClaw)、ecommerce(TradeClaw)

## Goals / Non-Goals

**Goals:**

- 热工位区和固定工位区采用「先横向后纵向」的布局策略，默认 4 列
- 工位总数由配置的 `maxSubAgents`（或系统默认值 8）决定，预先占满
- 休息区显示空闲的 sub-agent（座位/沙发旁），工作时动态移向热工位区
- 热工位活跃数 + 休息区空闲数 = 配置的最大 sub-agent 数
- agentToAgent 通信触发时，相关 Agent 自动移入会议区，通信线在会议区渲染
- 3D 场景自动跟随 2D zone 变化，包含平滑 lerp 过渡

**Non-Goals:**

- 不修改 Gateway 协议（不新增 RPC 方法），先用 `config.get` 尝试获取，不可用时降级为默认值
- 不改变固定工位区的主 Agent 分配逻辑（仍由 agentId hash 决定）
- 不实现 3D 场景中的新家具资产（复用现有沙发、椅子）
- 不处理 sub-agent 跨嵌套层级（depth > 1）的可视化，仅展示直接 sub-agent

## Decisions

### 决策 1：布局算法 — 先横后纵、基于配置预分配

**方案**：重写 `adaptiveCols` 函数，固定 4 列为默认（热工位区宽度 ≈537px，去除 padding 80px 后可用 457px，4 列每列 ≈114px > DeskUnit 的最小可辨识宽度 100px）。

```
function adaptiveCols(zone, agentCount):
  availW = zone.width - padX * 2
  maxCols = floor(availW / MIN_DESK_WIDTH)  // MIN_DESK_WIDTH = 100
  return min(maxCols, max(agentCount, 4))   // 至少 4 列，不超过物理限制
```

`calculateDeskSlots` 的 `slotCount` 参数改为由配置的 `maxSubAgents` 驱动，而非 `Math.max(length, 2)`。

**备选方案**：保持 `adaptiveCols` 动态策略但下限从 2 提升到 4 — 被否决，因为不够灵活且无法响应配置变化。

### 决策 2：配置获取策略 — 优雅降级

**方案**：在 `useSubAgentPoller` 或 `useGatewayConnection` 中，连接成功后尝试调用 `config.get` RPC 获取：
- `agents.defaults.subagents.maxConcurrent` → 存入 store 的 `maxSubAgents`
- `tools.agentToAgent.enabled` 和 `tools.agentToAgent.allow` → 存入 store 的 `agentToAgentConfig`

如果 RPC 不可用（旧版 Gateway 或权限不足），使用默认值 `maxSubAgents=8, agentToAgent.enabled=false`。

**备选方案**：硬编码或从环境变量读取 — 被否决，因为不同用户配置差异大，需要动态感知。

### 决策 3：休息区 Agent 显示 — Zone 迁移模型

**方案**：引入 Agent zone 生命周期：
1. sub-agent 首次创建时（通过 `addSubAgent`），如果当前非活跃状态（idle），分配到 `lounge` zone
2. 当 sub-agent 状态变为 `working/thinking/tool_calling/speaking` 时，迁移到 `hotDesk` zone
3. 当 sub-agent 长时间 idle（>30 秒）且热工位区有空闲位置压力时，可回到 `lounge`
4. 休息区布局：复用 LoungeDecor 区域，在沙发附近放置 AgentAvatar（使用 `calculateLoungePositions` 新函数），每个 Agent 旁显示小号 idle 头像

**Position 计算**：休息区的 Agent 位置使用沙发旁的固定锚点（最多 12 个位置，沿沙发和咖啡桌分布）。

### 决策 4：会议室 agentToAgent 通信激活

**方案**：在 `office-store.ts` 的 `processAgentEvent` 或 `updateCollaborationLinks` 之后，增加一个 effect/action：

```
afterCollaborationUpdate():
  groups = detectMeetingGroups(links, agents)
  applyMeetingGathering(agents, groups, moveToMeeting, returnFromMeeting)
```

触发条件：
- CollaborationLink 被创建或 strength 更新时
- 前提：`agentToAgentConfig.enabled === true`（从配置获取）
- 只有 `agentToAgentConfig.allow` 中的 Agent 间通信才触发会议区移动

**CollaborationLink 渲染**：当 Agent 在会议区时，ConnectionLine 的坐标使用 meetingSeats 位置而非 store 中的 position（已由 `moveToMeeting` 更新 position）。

### 决策 5：3D 场景同步

**方案**：3D 场景已通过 `position2dTo3d(agent.position)` 自动映射 2D 坐标，且 `AgentCharacter` 使用 `lerp` 平滑过渡。只需确保：
1. 休息区 Agent 的 2D position 在 ZONES.lounge 范围内，3D 自动映射到对应区域
2. 会议区 moveToMeeting 更新的 position 在 ZONES.meeting 范围内
3. `OfficeLayout3D` 中为休息区添加 Agent 相关的 3D 元素（如果需要额外指示）

无需新的 3D 渲染逻辑，利用现有 `AgentCharacter` + `position2dTo3d` 管线即可。

## Risks / Trade-offs

- **[Gateway 兼容性]** `config.get` RPC 可能在某些 Gateway 版本不可用 → 使用 try-catch + 默认值降级，不影响核心功能
- **[性能]** `applyMeetingGathering` 在每次 CollaborationLink 更新时执行 → 控制在 `detectMeetingGroups` 层做 early return（无变化时跳过），避免高频重渲染
- **[视觉拥挤]** 休息区同时显示装饰物和 Agent 头像可能拥挤 → 当有 Agent 在休息区时，适当缩小/隐藏部分装饰物，或将 Agent 布置在装饰物不重叠的锚点
- **[Zone 迁移闪烁]** sub-agent 状态快速切换（idle↔working）可能导致频繁 zone 迁移 → 增加 debounce（500ms），只有持续 idle 才迁回休息区
- **[会议区容量]** 最多支持 3 个并发会议组（已在 `MAX_CONCURRENT_MEETINGS` 中定义），超出时保留在原 zone → 可接受，实际使用中很少超过 3 组同时通信
