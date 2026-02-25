import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { AgentVisualStatus } from "@/gateway/types";
import { hasOperatorPermission } from "@/gateway/types";
import { useOfficeStore } from "@/store/office-store";

interface MenuItem {
  icon: string;
  label: string;
  action: () => void;
  disabled: boolean;
  tooltip?: string;
}

function isActivelySomething(status: AgentVisualStatus): boolean {
  return (
    status === "thinking" ||
    status === "tool_calling" ||
    status === "speaking" ||
    status === "spawning"
  );
}

export function AgentContextMenu() {
  const contextMenu = useOfficeStore((s) => s.contextMenu);
  const closeContextMenu = useOfficeStore((s) => s.closeContextMenu);
  const openForceActionDialog = useOfficeStore((s) => s.openForceActionDialog);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const agents = useOfficeStore((s) => s.agents);
  const scopes = useOfficeStore((s) => s.operatorScopes);

  const handleClickOutside = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
      }
    },
    [closeContextMenu],
  );

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu, handleClickOutside, handleKeyDown]);

  if (!contextMenu) {
    return null;
  }

  const agent = agents.get(contextMenu.agentId);
  if (!agent) {
    return null;
  }

  const hasPermission = hasOperatorPermission(scopes);
  const isActive = isActivelySomething(agent.status);
  const permissionTooltip = "需要 operator 权限";

  const items: MenuItem[] = [
    {
      icon: "⏸",
      label: "暂停",
      action: () => {
        closeContextMenu();
      },
      disabled: !hasPermission || !isActive,
      tooltip: !hasPermission ? permissionTooltip : undefined,
    },
    {
      icon: "▶",
      label: "恢复",
      action: () => {
        closeContextMenu();
      },
      disabled: true,
      tooltip: "暂不支持",
    },
    {
      icon: "⛔",
      label: "终止",
      action: () => {
        openForceActionDialog(contextMenu.agentId, "kill");
      },
      disabled: !hasPermission,
      tooltip: !hasPermission ? permissionTooltip : undefined,
    },
    {
      icon: "💬",
      label: "发送消息",
      action: () => {
        openForceActionDialog(contextMenu.agentId, "send-message");
      },
      disabled: !hasPermission,
      tooltip: !hasPermission ? permissionTooltip : undefined,
    },
    {
      icon: "👁",
      label: "查看详情",
      action: () => {
        selectAgent(contextMenu.agentId);
        closeContextMenu();
      },
      disabled: false,
    },
  ];

  const { x, y } = contextMenu.position;
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 9999,
  };

  return createPortal(
    <div
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
      className="min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="border-b border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {agent.name}
      </div>
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            if (!item.disabled) {
              item.action();
            }
          }}
          disabled={item.disabled}
          title={item.tooltip}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
            item.disabled ? "cursor-not-allowed text-gray-300 dark:text-gray-600" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          <span className="w-5 text-center">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
