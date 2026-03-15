import { useMemo } from "react";
import { useCronStore } from "@/store/console-stores/cron-store";
import { GlassPanel } from "./GlassPanel";
import { PanelHead } from "./PanelHead";

const DEFAULT_CRON_TASKS = [
  { name: "09:20 订单看板汇总", status: "scheduled" },
  { name: "10:00 线索清洗广播", status: "scheduled" },
  { name: "11:30 回款提醒", status: "scheduled" },
];

interface CronBoardProps {
  tasks?: Array<{ name: string; status: string }>;
}

export function CronBoard({ tasks = DEFAULT_CRON_TASKS }: CronBoardProps) {
  const cronTasks = useCronStore((s) => s.tasks);
  const liveTasks = useMemo(
    () =>
      cronTasks.map((task) => ({
        name: task.name,
        status: task.state.runningAtMs
          ? "running"
          : !task.enabled
            ? "paused"
            : task.state.lastRunStatus ?? "scheduled",
      })),
    [cronTasks],
  );
  const displayTasks = liveTasks.length > 0 ? liveTasks : tasks;

  return (
    <GlassPanel
      style={{
        position: "absolute",
        left: 980,
        top: 102,
        width: 240,
        height: 125,
        transform: "translateZ(16px)",
      }}
    >
      <PanelHead title="Cron 广播牌" subtitle="制度性任务，不拟人" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          padding: "0 14px 14px",
        }}
      >
        {displayTasks.slice(0, 3).map((task) => (
          <MiniRow key={task.name} left={task.name} right={task.status} />
        ))}
      </div>
    </GlassPanel>
  );
}

function MiniRow({ left, right }: { left: string; right: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        fontSize: 11,
        padding: "7px 9px",
        background: "rgba(255,255,255,.04)",
        borderRadius: 10,
      }}
    >
      <span style={{ color: "#e6eefc" }}>{left}</span>
      <span style={{ color: "var(--lo-muted)" }}>{right}</span>
    </div>
  );
}
