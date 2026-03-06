## ADDED Requirements

### Requirement: 展示智能体关联的定时任务
当用户切换到定时任务 Tab 时，系统 SHALL 调用 `cron.list` 获取所有定时任务，并按 `agentId === 当前选中智能体ID` 过滤，展示该智能体关联的定时任务列表。

每个任务项 SHALL 复用 `CronTaskCard` 组件展示：
- 任务名称 (name)
- 描述 (description)
- 调度规则 (schedule)
- 启用状态 (enabled / disabled)
- 上次运行状态 (ok / error / skipped)
- 上次运行时间 (lastRunAtMs)
- 下次运行时间 (nextRunAtMs)

#### Scenario: 该智能体有关联任务
- **WHEN** `cron.list` 返回的任务中有 `agentId` 匹配当前智能体的任务
- **THEN** 展示过滤后的任务列表

#### Scenario: 该智能体无关联任务
- **WHEN** 没有任务的 `agentId` 匹配当前智能体
- **THEN** 展示空状态提示"该智能体无定时任务"，并提供"新建定时任务"按钮

#### Scenario: 加载失败
- **WHEN** RPC 调用失败
- **THEN** 展示错误提示，并提供重试按钮

### Requirement: 新建定时任务
系统 SHALL 支持为当前智能体新建定时任务，复用 `CronTaskDialog` 组件。

新建时 SHALL 自动将 `agentId` 设置为当前选中智能体的 ID，用户无需手动指定。

#### Scenario: 点击新建
- **WHEN** 用户点击"新建定时任务"按钮
- **THEN** 打开 `CronTaskDialog`（空表单），提交后自动注入当前 agentId 调用 `cron.add`

#### Scenario: 新建成功
- **WHEN** `cron.add` 返回成功
- **THEN** 新任务出现在列表中，弹窗关闭

### Requirement: 编辑定时任务
系统 SHALL 支持编辑已有的定时任务，复用 `CronTaskDialog` 组件。

#### Scenario: 点击编辑
- **WHEN** 用户点击 CronTaskCard 上的编辑按钮
- **THEN** 打开 `CronTaskDialog`（填入已有数据），提交后调用 `cron.update`

#### Scenario: 编辑成功
- **WHEN** `cron.update` 返回成功
- **THEN** 列表中对应任务更新，弹窗关闭

### Requirement: 删除定时任务
系统 SHALL 支持删除定时任务。

#### Scenario: 点击删除
- **WHEN** 用户点击 CronTaskCard 上的删除按钮
- **THEN** 调用 `cron.remove`，成功后从列表中移除

### Requirement: 启停定时任务
系统 SHALL 支持切换定时任务的启用/禁用状态。

#### Scenario: 切换启停
- **WHEN** 用户通过 CronTaskCard 的 toggle 切换启用/禁用
- **THEN** 调用 `cron.update(id, { enabled: newValue })`，列表更新

### Requirement: 手动执行定时任务
系统 SHALL 支持手动执行定时任务。

#### Scenario: 点击执行
- **WHEN** 用户点击 CronTaskCard 上的"立即执行"按钮
- **THEN** 调用 `cron.run(id)`

### Requirement: 展示任务统计摘要
定时任务 Tab 顶部 SHALL 展示统计摘要：
- 总任务数（该智能体关联的）
- 启用数量
- 上次运行出错的数量

#### Scenario: 摘要信息
- **WHEN** 定时任务数据加载完成
- **THEN** 展示统计摘要

### Requirement: 支持刷新
定时任务 Tab SHALL 提供刷新按钮。

#### Scenario: 点击刷新
- **WHEN** 用户点击刷新按钮
- **THEN** 重新调用 `cron.list` 并重新过滤展示
