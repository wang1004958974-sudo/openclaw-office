import { useState, type RefObject } from "react";
import { createForceActionRpc } from "@/gateway/force-action-rpc";
import { hasOperatorPermission } from "@/gateway/types";
import type { GatewayWsClient } from "@/gateway/ws-client";
import { useOfficeStore } from "@/store/office-store";

interface ActionBarProps {
  wsClient: RefObject<GatewayWsClient | null>;
}

export function ActionBar({ wsClient }: ActionBarProps) {
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const agents = useOfficeStore((s) => s.agents);
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const scopes = useOfficeStore((s) => s.operatorScopes);
  const openForceActionDialog = useOfficeStore((s) => s.openForceActionDialog);

  const hasMeetingAgents = Array.from(agents.values()).some((a) => a.zone === "meeting");
  const visible = selectedAgentId !== null || hasMeetingAgents;
  const connected = connectionStatus === "connected";
  const permitted = hasOperatorPermission(scopes);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4 transition-all duration-300"
      style={{
        transform: visible ? "translateY(0)" : "translateY(100%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-gray-200/50 bg-white/70 px-4 py-2 shadow-lg backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70">
        <PauseButton
          agentId={selectedAgentId}
          wsClient={wsClient}
          disabled={!connected || !permitted}
          tooltip={!connected ? "未连接" : !permitted ? "需要 operator 权限" : undefined}
        />
        <SpawnButton />
        <DialogButton
          icon="💬"
          label="对话"
          disabled={!connected || !permitted || !selectedAgentId}
          tooltip={!connected ? "未连接" : !permitted ? "需要 operator 权限" : undefined}
          onClick={() => {
            if (selectedAgentId) {
              openForceActionDialog(selectedAgentId, "send-message");
            }
          }}
        />
      </div>
    </div>
  );
}

function PauseButton({
  agentId,
  wsClient,
  disabled,
  tooltip,
}: {
  agentId: string | null;
  wsClient: RefObject<GatewayWsClient | null>;
  disabled: boolean;
  tooltip?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const handleClick = async () => {
    if (disabled || !agentId || !wsClient.current) {
      setShowTip((v) => !v);
      return;
    }
    setBusy(true);
    try {
      const rpc = createForceActionRpc(wsClient.current);
      await rpc.pauseAgent(agentId);
    } catch {
      // Silently handle — Gateway may not support
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onBlur={() => setShowTip(false)}
        disabled={busy}
        className={`flex items-center gap-1.5 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium shadow-sm transition-colors dark:bg-gray-800/90 ${
          disabled
            ? "cursor-not-allowed text-gray-400"
            : "text-gray-700 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        }`}
      >
        <span>⏸</span>
        <span>暂停</span>
      </button>
      {showTip && tooltip && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-lg dark:bg-gray-700">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function SpawnButton() {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowTip((v) => !v)}
        onBlur={() => setShowTip(false)}
        className="flex items-center gap-1.5 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-white hover:text-gray-900 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      >
        <span>🔀</span>
        <span>派生子Agent</span>
      </button>
      {showTip && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-lg dark:bg-gray-700">
          功能开发中
        </div>
      )}
    </div>
  );
}

function DialogButton({
  icon,
  label,
  disabled,
  tooltip,
  onClick,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  tooltip?: string;
  onClick: () => void;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (disabled) {
            setShowTip((v) => !v);
          } else {
            onClick();
          }
        }}
        onBlur={() => setShowTip(false)}
        className={`flex items-center gap-1.5 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium shadow-sm transition-colors dark:bg-gray-800/90 ${
          disabled
            ? "cursor-not-allowed text-gray-400"
            : "text-gray-700 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </button>
      {showTip && tooltip && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-lg dark:bg-gray-700">
          {tooltip}
        </div>
      )}
    </div>
  );
}
