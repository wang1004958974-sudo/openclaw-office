import { useMemo } from "react";
import type { ConnectionStatus, ThemeMode, ViewMode } from "@/gateway/types";
import { isWebGLAvailable } from "@/lib/webgl-detect";
import { useOfficeStore } from "@/store/office-store";

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; pulse: boolean; label: string }> = {
  connecting: { color: "#eab308", pulse: true, label: "连接中..." },
  connected: { color: "#22c55e", pulse: false, label: "已连接" },
  reconnecting: { color: "#f97316", pulse: true, label: "重连中" },
  disconnected: { color: "#6b7280", pulse: false, label: "未连接" },
  error: { color: "#ef4444", pulse: false, label: "连接错误" },
};

interface TopBarProps {
  isMobile?: boolean;
}

export function TopBar({ isMobile = false }: TopBarProps) {
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const connectionError = useOfficeStore((s) => s.connectionError);
  const metrics = useOfficeStore((s) => s.globalMetrics);
  const viewMode = useOfficeStore((s) => s.viewMode);
  const setViewMode = useOfficeStore((s) => s.setViewMode);
  const theme = useOfficeStore((s) => s.theme);
  const setTheme = useOfficeStore((s) => s.setTheme);

  const webglAvailable = useMemo(() => isWebGLAvailable(), []);
  const statusCfg = STATUS_CONFIG[connectionStatus];

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-gray-800 dark:text-gray-100">OpenClaw Office</h1>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">v0.1.0</span>
      </div>

      <ViewModeSwitch
        viewMode={viewMode}
        setViewMode={setViewMode}
        webglAvailable={webglAvailable}
        isMobile={isMobile}
      />
      <ThemeToggle theme={theme} setTheme={setTheme} />

      <div className="mx-8 flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
        <span>
          活跃{" "}
          <strong className="text-gray-800 dark:text-gray-200">
            {metrics.activeAgents}/{metrics.totalAgents}
          </strong>
        </span>
        <span>
          Tokens <strong className="text-gray-800 dark:text-gray-200">{formatTokens(metrics.totalTokens)}</strong>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: statusCfg.color,
            animation: statusCfg.pulse ? "pulse 1.5s ease-in-out infinite" : "none",
          }}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {connectionError && connectionStatus === "error" ? connectionError : statusCfg.label}
        </span>
      </div>
    </header>
  );
}

function ViewModeSwitch({
  viewMode,
  setViewMode,
  webglAvailable,
  isMobile,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  webglAvailable: boolean;
  isMobile?: boolean;
}) {
  const modes: { key: ViewMode; label: string }[] = [
    { key: "2d", label: "2D" },
    { key: "3d", label: "3D" },
  ];

  return (
    <div className="ml-6 flex items-center rounded-md bg-gray-100 p-0.5 dark:bg-gray-800">
      {modes.map(({ key, label }) => {
        const isActive = viewMode === key;
        const disabled = key === "3d" && (!webglAvailable || isMobile);
        const title = disabled
          ? isMobile
            ? "小屏幕不支持 3D 模式"
            : "当前浏览器不支持 3D 渲染"
          : `切换到 ${label} 视图`;
        return (
          <button
            key={key}
            onClick={() => !disabled && setViewMode(key)}
            disabled={disabled}
            title={title}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : disabled
                  ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ThemeToggle({ theme, setTheme }: { theme: ThemeMode; setTheme: (t: ThemeMode) => void }) {
  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      title={theme === "light" ? "切换到暗色模式" : "切换到亮色模式"}
      className="ml-2 flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
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
