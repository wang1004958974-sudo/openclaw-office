import { useMemo } from "react";
import { useProjectionStore } from "@/perception/projection-store";
import type { AgentProjection } from "@/perception/types";
import { AgentCharacter2D5 } from "./characters/AgentCharacter2D5";
import { SUB_AGENT_SLOTS } from "./characters/constants";
import { SubAgentGhost, allocateSubAgentSlots } from "./characters/SubAgentGhost";
import { DESK_CONFIGS } from "./config";
import type { DeskConfig } from "./types";
import { OfficeStage } from "./scene/OfficeStage";
import { Desk } from "./workspace/Desk";
import { CronZone } from "./zones/CronZone";
import { GatewayZone } from "./zones/GatewayZone";
import { MemoryZone } from "./zones/MemoryZone";
import { OpsZone } from "./zones/OpsZone";
import { ProjectZone } from "./zones/ProjectZone";
import { StaffZone } from "./zones/StaffZone";

function agentStateToDeskStatus(state: string): "idle" | "busy" | "blocked" | "heartbeat" {
  switch (state) {
    case "WORKING":
    case "TOOL_CALL":
    case "COLLABORATING":
    case "INCOMING":
    case "ACK":
      return "busy";
    case "BLOCKED":
      return "blocked";
    default:
      return "idle";
  }
}

interface DeskAssignment {
  desk: DeskConfig;
  agent: AgentProjection | undefined;
}

/**
 * Dynamically assign real agents to desk slots.
 * First N agents (up to DESK_CONFIGS.length) get a desk.
 * Desks also get real names + status from agent data.
 */
function assignAgentsToDesks(agents: Map<string, AgentProjection>): DeskAssignment[] {
  const agentList = Array.from(agents.values());

  return DESK_CONFIGS.map((desk, i) => {
    const agent = agentList[i];
    if (agent) {
      return {
        desk: {
          ...desk,
          agentName: agent.agentId,
          role: agent.role,
          status: agentStateToDeskStatus(agent.state),
        },
        agent,
      };
    }
    return { desk, agent: undefined };
  });
}

export function LivingOfficeView() {
  const agents = useProjectionStore((s) => s.agents);

  const assignments = useMemo(() => assignAgentsToDesks(agents), [agents]);

  const subAgentEntries = Array.from(agents.values()).filter(
    (a) => a.state === "COLLABORATING",
  );
  const subAgentSlots = allocateSubAgentSlots(
    subAgentEntries.map((a) => ({ agentId: a.agentId, name: a.role })),
  );

  return (
    <div
      className="living-office"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 20% 0%, #16233f 0%, #0b1220 38%, #070b13 100%)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
        color: "var(--lo-text)",
      }}
    >
      {/* App background radials */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(circle at 20% 10%, rgba(92,200,255,.14), transparent 20%)",
            "radial-gradient(circle at 80% 20%, rgba(143,125,255,.10), transparent 24%)",
            "linear-gradient(180deg, rgba(255,255,255,.02), transparent 22%)",
            "linear-gradient(180deg, #0c1425 0%, #09111d 100%)",
          ].join(", "),
          pointerEvents: "none",
        }}
      />

      <OfficeStage>
        {/* Zones */}
        <GatewayZone />
        <OpsZone />
        <CronZone />
        <StaffZone />
        <ProjectZone />
        <MemoryZone />

        {/* Desks */}
        {assignments.map(({ desk, agent }) => (
          <Desk
            key={desk.id}
            config={desk}
            status={agent ? agentStateToDeskStatus(agent.state) : "idle"}
            bubble={agent?.taskSummary ?? ""}
          />
        ))}

        {/* Agent Characters (positioned independently above desks) */}
        {assignments.map(({ desk, agent }) => (
          <AgentCharacter2D5
            key={`char-${desk.id}`}
            agentId={agent?.agentId ?? desk.id}
            deskId={desk.id}
            name={agent?.agentId ?? desk.agentName}
            perceivedState={agent?.state ?? "IDLE"}
          />
        ))}

        {/* Sub-agent ghosts in Project Room */}
        {subAgentSlots.map((slot) => {
          const pos = SUB_AGENT_SLOTS[slot.slotIndex];
          if (!pos) return null;
          return (
            <SubAgentGhost
              key={`sub-${slot.agentId}`}
              agentId={slot.agentId}
              name={slot.name}
              position={pos}
              active
            />
          );
        })}
      </OfficeStage>
    </div>
  );
}
