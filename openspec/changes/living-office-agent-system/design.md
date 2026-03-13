## Context

产品蓝图的核心原则是"状态优先，动作次之"——用户首先要看懂"发生了什么"，其次才是"怎么动"。当前实现中 Agent 的视觉反馈仅限于状态圈颜色变化和简单的工位移动动画，缺乏"员工在办公室里工作"的拟人化表达。

示例原型中的 avatar 组件使用纯 CSS 构建了一个简约拟人小人（头部圆形 + 身体矩形 + 投影阴影 + 名称标签），通过 CSS transition 实现平滑移动，并用 CSS animation 实现走路时的弹跳效果（bob 动画）。

## Goals / Non-Goals

**Goals:**

- 构建 2.5D 拟人化角色组件，在等距空间中自然放置
- 实现 11 种可视状态的完整状态机，每种状态有明确的视觉规则
- 实现移动动画系统——只有重要事件触发走路，其他事件只改状态
- 实现路径线可视化——角色移动时显示起点到终点的光带
- 实现 sub-agent 临时角色的生成/消失效果

**Non-Goals:**

- 不做精细骨骼动画（保持简约拟人风格）
- 不做镜头跟随角色移动（V2 考虑）
- 不做角色之间的碰撞检测
- 不做角色自定义外观（V1 用统一的蓝色系身体）

## Decisions

### D1: 角色组件结构

```
src/components/living-office/characters/
├── AgentCharacter2D5.tsx    # 主角色组件
├── CharacterBody.tsx        # 身体渲染（头/身/影/标签）
├── PathLine.tsx             # 移动路径线
├── SubAgentGhost.tsx        # 临时 sub-agent 角色（轻量版）
└── constants.ts             # 角色尺寸、颜色、位置等常量
```

### D2: 角色视觉构成

```
AgentCharacter2D5
├── tag (名称标签) ─── 最顶层，translateZ(18px) 上方居中
├── head (头部) ─────── 14×14px 圆形，肤色，轻阴影
├── body (身体) ─────── 22×22px 圆角矩形，蓝色渐变，发光
├── shadow (投影) ────── 底部椭圆模糊阴影
```

整个角色容器 34×34px，使用 `position: absolute` 放置在 office 等距空间中，`translateZ(18px)` 悬浮于工位之上。

### D3: 状态机设计

状态转换图：

```
IDLE → INCOMING → ACK → WORKING → TOOL_CALL → WAITING → DONE → IDLE
                              ↓
                         COLLABORATING → RETURNING → DONE
                              ↓
                           BLOCKED → RECOVERED → WORKING
```

每个状态的视觉规则：

| 状态 | 角色动作 | 工位联动 | 是否移动 |
|------|---------|---------|---------|
| IDLE | 轻呼吸（微缩放 0.98-1.02） | 绿灯 | 否 |
| INCOMING | 亮度提升（brightness 1.1） | 微亮 | 否 |
| ACK | 点头动画（微下移+回弹） | 黄灯 | 否 |
| WORKING | 静止/专注 | 黄灯+显示器高亮 | 否 |
| TOOL_CALL | 身体微闪（opacity 波动） | 工具图标高亮 | 否 |
| WAITING | 慢闪烁（opacity 0.6-1.0） | 黄灯慢闪 | 否 |
| COLLABORATING | 走向项目室/白板 | 多工位联动 | **是** |
| RETURNING | 走回工位 | 路径回传 | **是** |
| DONE | 短亮（brightness 1.2 → 1.0） | 绿灯恢复 | 否 |
| BLOCKED | 红色叠加（混合红光） | 红灯 | 否 |
| RECOVERED | 红 → 黄 → 绿 渐变 | 恢复动画 | 否 |

### D4: 移动系统——CSS transition + 坐标映射

移动使用 CSS `transition: left 0.9s cubic-bezier(.25,.9,.2,1), top 0.9s cubic-bezier(.25,.9,.2,1)`。

移动触发条件（仅 5 种）：
1. 接到主线新任务 → 从工位走向 Gateway
2. 去白板讨论 → 从工位走向白板区
3. 进入项目室协作 → 从工位走向项目室
4. 回传结果到主线 → 从临时位置走回工位
5. 从阻塞切到排障 → IT Agent 走向阻塞工位

其他所有事件只在工位本地表达，不触发移动。

移动过程中角色添加 `.walking` class，触发 bob 弹跳动画和亮度提升。

### D5: 路径线实现

路径线使用绝对定位的 `div` 元素，通过计算起终点距离和角度，用 CSS `width` + `rotate()` 绘制。样式为蓝色渐变条（中间亮、两头暗），带光晕 `box-shadow`。显示 1.3 秒后自动消失。

### D6: Sub-agent 临时角色

Sub-agent 使用 `SubAgentGhost` 组件——与正式角色外观一致但：
- 整体透明度更低（opacity 0.7）
- 标签标注"临时"
- 只出现在项目室区域
- 带淡入/淡出动画（CSS `opacity` + `scale` transition）
- 任务完成后自动消失

### D7: 状态机与感知层的连接

```
ProjectionStore.state → useAgentProjection(agentId) → AgentCharacter2D5 props
                                                         ↓
                                                    内部 stateMachine 计算
                                                         ↓
                                                    CSS class / inline style
```

组件通过 Zustand selector 订阅对应 Agent 的投影状态，状态变化自动触发重渲染。状态机逻辑封装在 `src/perception/state-machine.ts` 中，纯函数实现（输入旧状态 + PerceivedEvent，输出新状态 + 视觉指令）。

## Risks / Trade-offs

- **[动画冲突] 多个 Agent 同时移动可能视觉混乱** → 通过 HoldController 的排队机制，同一时间最多允许 2 个 Agent 移动；第 3 个以上排队等待
- **[状态机复杂度] 11 种状态的转换矩阵需要仔细维护** → 使用显式的 `TRANSITIONS` Map，非法转换抛警告日志，不崩溃
- **[CSS transition 精度] 长距离移动可能看起来"飘"** → 使用 cubic-bezier 缓动曲线模拟加速-减速效果
- **[Sub-agent 堆叠] 多个 sub-agent 同时出现在项目室可能重叠** → 项目室最多显示 3 个 sub-agent，超出的只在面板列表中显示
