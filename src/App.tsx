import { lazy, Suspense, useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FloorPlan } from "@/components/office-2d/FloorPlan";
import { useGatewayConnection } from "@/hooks/useGatewayConnection";
import { useResponsive } from "@/hooks/useResponsive";
import { useOfficeStore } from "@/store/office-store";

const Scene3D = lazy(() => import("@/components/office-3d/Scene3D"));

function Scene3DFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="text-sm text-gray-500 dark:text-gray-400">加载 3D 场景...</span>
      </div>
    </div>
  );
}

function OfficeView() {
  const viewMode = useOfficeStore((s) => s.viewMode);
  const [fading, setFading] = useState(false);
  const [displayMode, setDisplayMode] = useState(viewMode);

  useEffect(() => {
    if (viewMode !== displayMode) {
      setFading(true);
      const timer = setTimeout(() => {
        setDisplayMode(viewMode);
        setFading(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewMode, displayMode]);

  return (
    <div
      className="h-full w-full transition-opacity duration-300"
      style={{ opacity: fading ? 0 : 1 }}
    >
      {displayMode === "2d" ? (
        <FloorPlan />
      ) : (
        <Suspense fallback={<Scene3DFallback />}>
          <Scene3D />
        </Suspense>
      )}
    </div>
  );
}

function ThemeSync() {
  const theme = useOfficeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return null;
}

export function App() {
  const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || "ws://localhost:18789";
  const gatewayToken = import.meta.env.VITE_GATEWAY_TOKEN || "";
  const { isMobile } = useResponsive();
  const setViewMode = useOfficeStore((s) => s.setViewMode);

  const { wsClient } = useGatewayConnection({ url: gatewayUrl, token: gatewayToken });

  useEffect(() => {
    if (isMobile) {
      setViewMode("2d");
    }
  }, [isMobile, setViewMode]);

  return (
    <>
      <ThemeSync />
      <AppShell wsClient={wsClient} isMobile={isMobile}>
        <OfficeView />
      </AppShell>
    </>
  );
}
