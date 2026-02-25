import { useState, useRef, useEffect } from "react";
import { SvgAvatar } from "@/components/shared/SvgAvatar";
import { createForceActionRpc } from "@/gateway/force-action-rpc";
import type { GatewayWsClient } from "@/gateway/ws-client";
import { useOfficeStore } from "@/store/office-store";

interface ForceActionDialogProps {
  wsClient: React.RefObject<GatewayWsClient | null>;
}

export function ForceActionDialog({ wsClient }: ForceActionDialogProps) {
  const dialog = useOfficeStore((s) => s.forceActionDialog);
  const agents = useOfficeStore((s) => s.agents);
  const closeDialog = useOfficeStore((s) => s.closeForceActionDialog);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (dialog) {
      setMessage("");
      setLoading(false);
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [dialog]);

  if (!dialog) {
    return null;
  }

  const agent = agents.get(dialog.agentId);
  if (!agent) {
    return null;
  }

  const handleSend = async () => {
    if (!wsClient.current) {
      setError("未连接到 Gateway");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rpc = createForceActionRpc(wsClient.current);
      if (dialog.mode === "send-message") {
        await rpc.sendMessageToAgent(dialog.agentId, message);
      } else {
        await rpc.killAgent(dialog.agentId);
      }
      closeDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="w-[400px] rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <SvgAvatar agentId={agent.id} size={40} />
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{agent.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {dialog.mode === "send-message" ? "发送消息" : "终止确认"}
            </div>
          </div>
        </div>

        {dialog.mode === "send-message" ? (
          <>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="输入指令..."
              rows={4}
              disabled={loading}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={closeDialog}
                disabled={loading}
                className="rounded-lg px-4 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleSend}
                disabled={loading || message.trim().length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading && <Spinner />}
                发送
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              确定要终止 <strong>{agent.name}</strong> 的当前运行吗？此操作不可撤销。
            </p>
            {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeDialog}
                disabled={loading}
                className="rounded-lg px-4 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {loading && <Spinner />}
                终止
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}
