import { useTranslation } from "react-i18next";
import { useProjectionStore } from "@/perception/projection-store";
import { useOfficeStore } from "@/store/office-store";
import { GlassPanel } from "./GlassPanel";
import { PanelHead } from "./PanelHead";

interface OpsBoardProps {
  rules?: string[];
}

export function OpsBoard({ rules = [] }: OpsBoardProps) {
  const { t } = useTranslation("office");
  const opsEvents = useProjectionStore((s) => s.sceneArea.opsRules);
  const agents = useOfficeStore((s) => s.agents);
  const links = useOfficeStore((s) => s.links);
  const maxSubAgents = useOfficeStore((s) => s.maxSubAgents);
  const agentToAgentConfig = useOfficeStore((s) => s.agentToAgentConfig);

  const errorCount = Array.from(agents.values()).filter((agent) => agent.status === "error").length;
  const activeSubAgents = Array.from(agents.values()).filter(
    (agent) => agent.isSubAgent && !agent.isPlaceholder,
  ).length;
  const enabledLabel = agentToAgentConfig.enabled
    ? t("livingOffice.panels.opsEnabled")
    : t("livingOffice.panels.opsDisabled");
  const liveRules =
    opsEvents.length > 0
      ? opsEvents.slice(-4).reverse().map((entry) => `${entry.tag} · ${entry.text}`)
      : [
        `${t("livingOffice.panels.opsErrorAgents")} · ${errorCount}`,
        `${t("livingOffice.panels.opsCollabLinks")} · ${links.length}`,
        `${t("livingOffice.panels.opsAgentToAgent")} · ${enabledLabel}`,
        `${t("livingOffice.panels.opsSubCapacity")} · ${activeSubAgents}/${maxSubAgents}`,
      ];
  const displayRules = liveRules.length > 0 ? liveRules : rules;

  return (
    <GlassPanel
      style={{
        position: "absolute",
        left: 508,
        top: 38,
        width: 504,
        height: 214,
        transform: "translateZ(16px)",
      }}
    >
      <PanelHead title={t("livingOffice.panels.opsTitle")} subtitle={t("livingOffice.panels.opsSubtitle")} />
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
            <span style={{ color: "var(--lo-muted)" }}>{t("livingOffice.panels.opsLive")}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
