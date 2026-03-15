import { useProjectionStore } from "@/perception/projection-store";
import { useOfficeStore } from "@/store/office-store";
import { GlassPanel } from "./GlassPanel";
import { PanelHead } from "./PanelHead";

interface OpsBoardProps {
  rules?: string[];
}

export function OpsBoard({ rules = [] }: OpsBoardProps) {
  const opsEvents = useProjectionStore((s) => s.sceneArea.opsRules);
  const agents = useOfficeStore((s) => s.agents);
  const links = useOfficeStore((s) => s.links);
  const maxSubAgents = useOfficeStore((s) => s.maxSubAgents);
  const agentToAgentConfig = useOfficeStore((s) => s.agentToAgentConfig);

  const errorCount = Array.from(agents.values()).filter((agent) => agent.status === "error").length;
  const activeSubAgents = Array.from(agents.values()).filter(
    (agent) => agent.isSubAgent && !agent.isPlaceholder,
  ).length;
  const liveRules =
    opsEvents.length > 0
      ? opsEvents.slice(-4).reverse().map((entry) => `${entry.tag} · ${entry.text}`)
      : [
        `error-agents · ${errorCount}`,
        `collaboration-links · ${links.length}`,
        `agent-to-agent · ${agentToAgentConfig.enabled ? "enabled" : "disabled"}`,
        `sub-agent-capacity · ${activeSubAgents}/${maxSubAgents}`,
      ];
  const displayRules = liveRules.length > 0 ? liveRules : rules;

  return (
    <GlassPanel
      style={{
        position: "absolute",
        left: 480,
        top: 100,
        width: 390,
        height: 154,
        transform: "translateZ(16px)",
      }}
    >
      <PanelHead title="组织行为板" subtitle="因果链比热闹更重要" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          padding: "0 14px 14px",
        }}
      >
        {displayRules.slice(0, 4).map((rule) => (
          <div
            key={rule}
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
            <span style={{ color: "#e6eefc" }}>{rule}</span>
            <span style={{ color: "var(--lo-muted)" }}>live</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
