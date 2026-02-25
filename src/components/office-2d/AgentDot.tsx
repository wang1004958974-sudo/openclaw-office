import { useState } from "react";
import type { VisualAgent } from "@/gateway/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { useOfficeStore } from "@/store/office-store";

interface AgentDotProps {
  agent: VisualAgent;
}

export function AgentDot({ agent }: AgentDotProps) {
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const openContextMenu = useOfficeStore((s) => s.openContextMenu);
  const theme = useOfficeStore((s) => s.theme);
  const [hovered, setHovered] = useState(false);

  const isSelected = selectedAgentId === agent.id;
  const radius = isSelected ? 15 : 12;
  const color = STATUS_COLORS[agent.status];
  const isDark = theme === "dark";

  return (
    <g
      transform={`translate(${agent.position.x}, ${agent.position.y})`}
      style={{ cursor: "pointer" }}
      onClick={() => selectAgent(agent.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        openContextMenu(agent.id, { x: e.clientX, y: e.clientY });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isSelected && (
        <circle r={radius + 4} fill="none" stroke={color} strokeWidth={2} opacity={0.5} />
      )}

      <circle
        r={radius}
        fill={color}
        style={{
          transition: "fill 400ms ease, r 200ms ease",
        }}
      />

      {/* Initial letter */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={11}
        fontWeight="bold"
        style={{ pointerEvents: "none" }}
      >
        {agent.name.charAt(0).toUpperCase()}
      </text>

      {hovered && (
        <g transform="translate(0, -24)">
          <rect
            x={-60}
            y={-16}
            width={120}
            height={28}
            rx={4}
            fill={isDark ? "#1e293b" : "white"}
            stroke={isDark ? "#475569" : "#d1d5db"}
            strokeWidth={0.5}
          />
          <text textAnchor="middle" dominantBaseline="central" fill={isDark ? "#e2e8f0" : "#374151"} fontSize={10} y={-2}>
            {agent.name} · {STATUS_LABELS[agent.status]}
          </text>
        </g>
      )}
    </g>
  );
}
