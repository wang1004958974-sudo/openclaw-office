## 1. 配置感知层（config-awareness）

- [x] 1.1 在 `office-store.ts` 中新增 `maxSubAgents: number`（默认 8）和 `agentToAgentConfig: { enabled: boolean; allow: string[] }`（默认 `{ enabled: false, allow: [] }`）状态字段及对应 setter action
- [x] 1.2 在 `useGatewayConnection` 或 `useSubAgentPoller` 中，连接成功后尝试调用 `config.get` RPC 获取 `agents.defaults.subagents.maxConcurrent` 和 `tools.agentToAgent`，存入 store；失败时静默降级为默认值
- [x] 1.3 在 `mock-adapter.ts` 中为 `config.get` 提供可配置的 mock 响应，支持自定义 `maxSubAgents` 和 `agentToAgent` 配置
- [x] 1.4 编写配置获取逻辑的单元测试（成功获取、RPC 失败降级、配置值合理性校验）

## 2. 工位布局引擎重构（workspace-layout-engine）

- [x] 2.1 重写 `position-allocator.ts` 中的 `adaptiveCols` 函数，基于区域宽度和 `MIN_DESK_WIDTH=100` 计算最大列数，默认至少 4 列
- [x] 2.2 修改 `FloorPlan.tsx` 中热工位区的 `calculateDeskSlots` 调用，将 `slotCount` 参数改为 `store.maxSubAgents`（而非 `Math.max(length, 2)`）
- [x] 2.3 修改 `FloorPlan.tsx` 中固定工位区的 `calculateDeskSlots` 调用，确保 `slotCount` 为 `Math.max(主Agent数, 4)`
- [x] 2.4 更新 `constants.ts` 中的网格常量（如 `DESK_GRID_COLS`），使其与新的布局策略一致
- [x] 2.5 编写 `calculateDeskSlots` 和新 `adaptiveCols` 的单元测试，验证横向优先、列数自适应、超出物理宽度时自动缩减

## 3. 休息区 Agent 显示（lounge-agent-display）

- [x] 3.1 在 `position-allocator.ts` 中新增 `calculateLoungePositions` 函数，在休息区沙发/咖啡桌旁定义最多 12 个锚点
- [x] 3.2 修改 `office-store.ts` 中的 `addSubAgent` action：sub-agent 初始创建时 zone 设为 `"lounge"`，position 使用 `calculateLoungePositions` 分配
- [x] 3.3 在 `office-store.ts` 的 `processAgentEvent`（或新增 effect）中实现 zone 迁移逻辑：idle sub-agent 从 lounge 变活跃时迁到 hotDesk，持续 idle 30 秒后从 hotDesk 迁回 lounge
- [x] 3.4 实现 zone 迁移防抖：lounge→hotDesk 500ms、hotDesk→lounge 30 秒
- [x] 3.5 在 `FloorPlan.tsx` 中新增 `LoungeAgents` 子组件，渲染 zone 为 `"lounge"` 的 sub-agent 头像
- [x] 3.6 编写 zone 迁移逻辑和防抖的单元测试

## 4. 会议室 agentToAgent 通信激活（meeting-room-activation）

- [x] 4.1 在 `office-store.ts` 的 `updateCollaborationLinks` 之后，增加条件调用：当 `agentToAgentConfig.enabled` 时执行 `detectMeetingGroups` + `applyMeetingGathering`
- [x] 4.2 在 `meeting-manager.ts` 的 `detectMeetingGroups` 中增加 `allowList` 过滤：仅 `allow` 列表中的 Agent 间通信触发会议聚集
- [x] 4.3 实现 `applyMeetingGathering` 的调用频率控制（throttle 500ms）和无变化时 early return
- [x] 4.4 确保 `ConnectionLine` 在 Agent 移入会议区后使用更新后的 `agent.position`（已由 `moveToMeeting` 更新）
- [x] 4.5 更新 `meeting-manager.test.ts`，增加 allowList 过滤、throttle 和 agentToAgent 配置驱动的测试用例

## 5. 2D Floor Plan 更新（floor-plan-2d）

- [x] 5.1 更新 `FloorPlan.tsx` 中 `hotDeskAgents` 过滤逻辑，区分 zone 为 `"hotDesk"` 的活跃 sub-agent 和 zone 为 `"lounge"` 的空闲 sub-agent
- [x] 5.2 在 `FloorPlan.tsx` Layer 5 之后增加休息区 Agent 渲染层（`LoungeAgents` 组件）
- [x] 5.3 确保 `MeetingChairs` 和 meeting Agent 渲染使用动态激活的 meetingAgents 列表
- [x] 5.4 验证 `SpeechBubbleOverlay` 在 Agent 处于不同 zone 时的位置正确性

## 6. 3D 场景同步

- [x] 6.1 验证 `AgentCharacter` 的 `position2dTo3d` 映射在 lounge zone Agent 位置时，3D 坐标落在休息区区域
- [x] 6.2 验证 lounge→hotDesk 和 desk→meeting 的 zone 迁移在 3D 中产生平滑 lerp 过渡
- [x] 6.3 如有需要，在 `OfficeLayout3D.tsx` 休息区增加额外的 Agent 指示元素（如发光环）

## 7. 集成测试与验证

- [x] 7.1 在 mock 模式下验证：4 个主 Agent 在固定工位区（4 列）、12 个预分配热工位、空闲 sub-agent 在休息区
- [x] 7.2 连接真实 Gateway 验证：sub-agent 创建后出现在休息区，工作开始后移至热工位区
- [x] 7.3 连接真实 Gateway 验证：agentToAgent 通信时 Agent 移入会议区，通信结束后返回
- [x] 7.4 更新现有 `subagent-poller-integration.test.ts` 和 `subagent-poller.test.ts`，适配新的 zone 分配逻辑
- [x] 7.5 切换 2D/3D 视图验证两种渲染模式下 zone 迁移的正确性
