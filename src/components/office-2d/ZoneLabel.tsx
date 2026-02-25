import { useOfficeStore } from "@/store/office-store";

interface ZoneLabelProps {
  zone: { x: number; y: number; width: number; height: number; label: string };
}

export function ZoneLabel({ zone }: ZoneLabelProps) {
  const theme = useOfficeStore((s) => s.theme);
  const fill = theme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <text x={zone.x + 16} y={zone.y + 24} fill={fill} fontSize={13} fontWeight={500}>
      {zone.label}
    </text>
  );
}
