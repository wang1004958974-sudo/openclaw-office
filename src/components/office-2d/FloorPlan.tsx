import { SpeechBubbleOverlay } from "@/components/overlays/SpeechBubble";
import { SVG_WIDTH, SVG_HEIGHT, ZONES, ZONE_COLORS, ZONE_COLORS_DARK } from "@/lib/constants";
import { useOfficeStore } from "@/store/office-store";
import { AgentDot } from "./AgentDot";
import { ConnectionLine } from "./ConnectionLine";
import { ZoneLabel } from "./ZoneLabel";

export function FloorPlan() {
  const agents = useOfficeStore((s) => s.agents);
  const links = useOfficeStore((s) => s.links);
  const theme = useOfficeStore((s) => s.theme);

  const agentList = Array.from(agents.values());
  const isDark = theme === "dark";
  const zoneColors = isDark ? ZONE_COLORS_DARK : ZONE_COLORS;
  const zoneStroke = isDark ? "#334155" : "#c8d0dc";

  return (
    <div className="relative h-full w-full bg-gray-50 dark:bg-gray-950">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Zone backgrounds */}
        {Object.entries(ZONES).map(([key, zone]) => (
          <rect
            key={key}
            x={zone.x}
            y={zone.y}
            width={zone.width}
            height={zone.height}
            rx={8}
            fill={zoneColors[key as keyof typeof ZONE_COLORS]}
            stroke={zoneStroke}
            strokeWidth={1}
          />
        ))}

        {/* Zone labels */}
        {Object.entries(ZONES).map(([key, zone]) => (
          <ZoneLabel key={`label-${key}`} zone={zone} />
        ))}

        {/* Collaboration lines */}
        {links.map((link) => {
          const source = agents.get(link.sourceId);
          const target = agents.get(link.targetId);
          if (!source || !target) {
            return null;
          }
          return (
            <ConnectionLine
              key={`${link.sourceId}-${link.targetId}`}
              x1={source.position.x}
              y1={source.position.y}
              x2={target.position.x}
              y2={target.position.y}
              strength={link.strength}
            />
          );
        })}

        {/* Agent dots */}
        {agentList.map((agent) => (
          <AgentDot key={agent.id} agent={agent} />
        ))}
      </svg>

      {/* Speech bubbles (HTML overlay) */}
      {agentList
        .filter((a) => a.speechBubble)
        .map((agent) => (
          <SpeechBubbleOverlay key={`bubble-${agent.id}`} agent={agent} />
        ))}
    </div>
  );
}
