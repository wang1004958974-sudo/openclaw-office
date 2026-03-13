## 1. 状态机

- [x] 1.1 创建 `src/perception/state-machine.ts`，定义 11 种 `PerceivedAgentState` 和合法转换矩阵 `TRANSITIONS`
- [x] 1.2 实现 `transition(currentState, event): { nextState, visualInstructions }` 纯函数
- [x] 1.3 实现非法转换的警告日志降级处理
- [x] 1.4 实现快速跳回 IDLE 的通用逃生路径
- [x] 1.5 为状态机编写单元测试（覆盖所有合法转换、非法转换降级、IDLE 跳回）

## 2. 角色组件

- [x] 2.1 创建 `src/components/living-office/characters/constants.ts`，定义角色尺寸、颜色、`POSITION_MAP` 坐标映射表
- [x] 2.2 创建 `src/components/living-office/characters/CharacterBody.tsx`，渲染头/身/影/标签四个层
- [x] 2.3 创建 `src/components/living-office/characters/AgentCharacter2D5.tsx`，主角色组件，消费 ProjectionStore 状态，根据状态机输出应用对应 CSS class
- [x] 2.4 实现 IDLE 呼吸动画（微缩放 CSS animation）
- [x] 2.5 实现 WORKING 亮度提升 + TOOL_CALL 微闪效果
- [x] 2.6 实现 BLOCKED 红色叠加 + WAITING 慢闪烁
- [x] 2.7 实现 DONE 短亮反馈（brightness 1.2 → 1.0 transition）
- [x] 2.8 实现 RECOVERED 红→黄→绿 颜色渐变动画

## 3. 移动动画引擎

- [x] 3.1 在 `AgentCharacter2D5` 中实现 CSS transition 移动（left/top + cubic-bezier 缓动）
- [x] 3.2 实现走路动画（.walking class + bob 弹跳 + brightness 提升）
- [x] 3.3 实现移动完成后自动移除 .walking class 的清理逻辑
- [x] 3.4 实现并发移动控制——最多 2 个 Agent 同时移动，超出排队（在 `src/perception/movement-queue.ts`）
- [x] 3.5 实现移动触发条件守卫——仅 5 种事件允许触发移动

## 4. 路径线

- [x] 4.1 创建 `src/components/living-office/characters/PathLine.tsx`，渲染起点到终点的光带路径线
- [x] 4.2 实现距离和角度计算（width + rotate transform）
- [x] 4.3 实现 1.3 秒自动消失逻辑（opacity transition）

## 5. Sub-agent 临时角色

- [x] 5.1 创建 `src/components/living-office/characters/SubAgentGhost.tsx`，轻量版临时角色
- [x] 5.2 实现淡入/淡出动画（opacity + scale transition）
- [x] 5.3 实现项目室最多 3 个临时角色的上限控制
- [x] 5.4 实现协作完成后自动清理

## 6. 集成与场景连接

- [x] 6.1 在 `LivingOfficeView.tsx` 中集成 5 个正式 Agent 角色组件
- [x] 6.2 连接 ProjectionStore → AgentCharacter2D5 的状态订阅
- [x] 6.3 连接 PerceptionEngine → 移动触发 → 坐标映射的完整链路
- [x] 6.4 在项目室区域集成 SubAgentGhost 渲染

## 7. 测试

- [x] 7.1 为状态机 `transition` 函数编写完整单元测试
- [x] 7.2 为 `AgentCharacter2D5` 编写基础渲染测试
- [x] 7.3 为 `PathLine` 编写角度/距离计算测试
- [x] 7.4 验证 TypeScript 类型检查通过
- [x] 7.5 验证 Lint 检查通过
