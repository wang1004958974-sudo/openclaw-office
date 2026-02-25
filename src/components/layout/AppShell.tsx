import { useEffect, type ReactNode, type RefObject } from "react";
import { AgentContextMenu } from "@/components/overlays/AgentContextMenu";
import { ForceActionDialog } from "@/components/overlays/ForceActionDialog";
import type { GatewayWsClient } from "@/gateway/ws-client";
import { useOfficeStore } from "@/store/office-store";
import { ActionBar } from "./ActionBar";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
  wsClient?: RefObject<GatewayWsClient | null>;
  isMobile?: boolean;
}

export function AppShell({ children, wsClient, isMobile = false }: AppShellProps) {
  const nullRef = { current: null } as RefObject<GatewayWsClient | null>;
  const sidebarCollapsed = useOfficeStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useOfficeStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile, setSidebarCollapsed]);

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <TopBar isMobile={isMobile} />
      <div className="relative flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden">
          {children}
          <ActionBar wsClient={wsClient ?? nullRef} />
        </main>
        {isMobile ? (
          <>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="fixed bottom-0 left-1/2 z-20 flex h-10 w-full max-w-xs -translate-x-1/2 items-center justify-center border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
              aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
            >
                    <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
            </button>
            {!sidebarCollapsed && (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSidebarCollapsed(true)}
                  onKeyDown={(e) => e.key === "Escape" && setSidebarCollapsed(true)}
                  className="fixed inset-0 z-30 bg-black/30"
                  aria-label="关闭侧栏"
                />
                <aside className="fixed inset-x-0 bottom-10 top-12 z-40 overflow-hidden rounded-t-xl border-t border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                  <Sidebar />
                </aside>
              </>
            )}
          </>
        ) : (
          <Sidebar />
        )}
      </div>
      <AgentContextMenu />
      <ForceActionDialog wsClient={wsClient ?? nullRef} />
    </div>
  );
}
