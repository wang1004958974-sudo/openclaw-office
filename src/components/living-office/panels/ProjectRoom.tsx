import { useMemo } from "react";
import { useProjectionStore } from "@/perception/projection-store";
import { useOfficeStore } from "@/store/office-store";
import { GlassPanel } from "./GlassPanel";
import { PanelHead } from "./PanelHead";

interface ProjectRoomProps {
  tasks?: Array<{ title: string; subtitle: string }>;
}

const DEFAULT_TASKS = [{ title: "暂无临时协作", subtitle: "temporary workforce zone" }];

export function ProjectRoom({ tasks = DEFAULT_TASKS }: ProjectRoomProps) {
  const lastSessionsSnapshot = useOfficeStore((s) => s.lastSessionsSnapshot);
  const projectedTasks = useProjectionStore((s) => s.sceneArea.projectTasks);
  const sessions = lastSessionsSnapshot?.sessions;
  const liveTasks =
    sessions && sessions.length > 0
      ? sessions.map((session) => ({
          title: session.label || session.agentId,
          subtitle: session.task || session.requesterSessionKey,
        }))
      : projectedTasks;
  const displayTasks = useMemo(
    () => (liveTasks.length > 0 ? liveTasks : tasks),
    [liveTasks, tasks],
  );

  return (
    <GlassPanel
      style={{
        position: "absolute",
        left: 990,
        top: 360,
        width: 220,
        height: 150,
        transform: "translateZ(16px)",
      }}
    >
      <PanelHead title="临时项目室" subtitle="Sub-agent 只在这里亮起" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "0 14px 14px",
        }}
      >
        {displayTasks.slice(0, 3).map((task) => (
          <div
            key={task.title}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.05)",
              fontSize: 11,
              color: "#e6eefc",
            }}
          >
            {task.title}
            <small
              style={{ color: "var(--lo-muted)", display: "block", marginTop: 3 }}
            >
              {task.subtitle}
            </small>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
