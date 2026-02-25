import { lazy, Suspense, useState } from "react";
import { useOfficeStore } from "@/store/office-store";

const TokenLineChart = lazy(() =>
  import("./TokenLineChart").then((m) => ({ default: m.TokenLineChart })),
);
const CostPieChart = lazy(() =>
  import("./CostPieChart").then((m) => ({ default: m.CostPieChart })),
);
const NetworkGraph = lazy(() =>
  import("./NetworkGraph").then((m) => ({ default: m.NetworkGraph })),
);
const ActivityHeatmap = lazy(() =>
  import("./ActivityHeatmap").then((m) => ({ default: m.ActivityHeatmap })),
);

function TabSpinner() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  );
}

type TabId = "overview" | "trend" | "topology" | "activity";

export function MetricsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const metrics = useOfficeStore((s) => s.globalMetrics);

  const cards = [
    {
      label: "Active Agents",
      value: `${metrics.activeAgents}/${metrics.totalAgents}`,
      color: "#3b82f6",
    },
    {
      label: "Total Tokens",
      value: formatTokens(metrics.totalTokens),
      color: "#22c55e",
    },
    {
      label: "Collaboration",
      value: `${Math.round(metrics.collaborationHeat)}%`,
      color: "#f97316",
    },
    {
      label: "Token Rate",
      value: `${metrics.tokenRate.toFixed(0)}/min`,
      color: "#a855f7",
    },
  ];

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "概览" },
    { id: "trend", label: "趋势" },
    { id: "topology", label: "拓扑" },
    { id: "activity", label: "活跃" },
  ];

  return (
    <div className="flex flex-col border-b border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-2 gap-1.5 p-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg bg-gray-50 px-2 py-1.5 text-center dark:bg-gray-800">
            <div className="text-lg font-bold" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">{card.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 border-t border-gray-100 px-2 py-1 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded px-2 py-1 text-xs ${
              activeTab === t.id ? "bg-gray-200 font-medium dark:bg-gray-700 dark:text-gray-200" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-[200px] p-2">
        {activeTab === "overview" && (
          <Suspense fallback={<TabSpinner />}>
            <CostPieChart />
          </Suspense>
        )}
        {activeTab === "trend" && (
          <Suspense fallback={<TabSpinner />}>
            <TokenLineChart />
          </Suspense>
        )}
        {activeTab === "topology" && (
          <Suspense fallback={<TabSpinner />}>
            <NetworkGraph />
          </Suspense>
        )}
        {activeTab === "activity" && (
          <Suspense fallback={<TabSpinner />}>
            <ActivityHeatmap />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`;
  }
  return String(n);
}
