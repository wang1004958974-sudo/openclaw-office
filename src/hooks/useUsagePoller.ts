import { useEffect, useRef } from "react";
import type { GatewayRpcClient } from "@/gateway/rpc-client";
import type { TokenSnapshot } from "@/gateway/types";
import { useOfficeStore } from "@/store/office-store";

const POLL_INTERVAL_MS = 60_000;
const FAILURE_THRESHOLD = 3;

interface SessionTokenRow {
  key?: string;
  totalTokens?: number;
  totalTokensFresh?: boolean;
}

interface SessionsListResponse {
  sessions?: SessionTokenRow[];
}

interface UsageCostResponse {
  byAgent?: Record<string, number>;
  costs?: Record<string, number>;
}

export function useUsagePoller(rpcRef: React.RefObject<GatewayRpcClient | null>) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureCountRef = useRef(0);

  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const pushTokenSnapshot = useOfficeStore((s) => s.pushTokenSnapshot);
  const setAgentCosts = useOfficeStore((s) => s.setAgentCosts);

  useEffect(() => {
    if (connectionStatus !== "connected" || !rpcRef.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const poll = async () => {
      const rpc = rpcRef.current;
      if (!rpc) {
        return;
      }

      try {
        const [sessionsResp, costResp] = await Promise.all([
          rpc.request<SessionsListResponse>("sessions.list"),
          rpc.request<UsageCostResponse>("usage.cost").catch(() => null),
        ]);

        failureCountRef.current = 0;

        const snapshot = buildSnapshotFromSessions(sessionsResp?.sessions ?? []);

        if (snapshot) {
          pushTokenSnapshot(snapshot);
        }

        const costs = costResp?.byAgent ?? costResp?.costs ?? {};
        if (Object.keys(costs).length > 0) {
          setAgentCosts(costs);
        }
      } catch {
        failureCountRef.current += 1;

        if (failureCountRef.current >= FAILURE_THRESHOLD) {
          const history = useOfficeStore.getState().eventHistory;
          const snapshot = estimateFromEventHistory(history);
          if (snapshot) {
            pushTokenSnapshot(snapshot);
          }
        }
      }
    };

    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [connectionStatus, pushTokenSnapshot, setAgentCosts]);
}

export function buildSnapshotFromSessions(sessions: SessionTokenRow[]): TokenSnapshot | null {
  const byAgent: Record<string, number> = {};
  let total = 0;

  for (const session of sessions) {
    if (session.totalTokensFresh === false) {
      continue;
    }
    if (typeof session.totalTokens !== "number" || !Number.isFinite(session.totalTokens)) {
      continue;
    }
    const agentId = extractAgentIdFromSessionKey(session.key);
    if (!agentId) {
      continue;
    }
    byAgent[agentId] = (byAgent[agentId] ?? 0) + session.totalTokens;
    total += session.totalTokens;
  }

  if (total === 0) {
    return null;
  }

  return {
    timestamp: Date.now(),
    total,
    byAgent,
  };
}

function extractAgentIdFromSessionKey(sessionKey: string | undefined): string | null {
  const match = /^agent:([^:]+):/.exec(sessionKey ?? "");
  return match?.[1] ?? null;
}

function estimateFromEventHistory(
  history: { timestamp: number; agentId: string; stream: string }[],
): TokenSnapshot | null {
  const byAgent: Record<string, number> = {};
  let total = 0;

  for (const item of history) {
    if (item.stream !== "tool") {
      continue;
    }
    const tokens = 100;
    byAgent[item.agentId] = (byAgent[item.agentId] ?? 0) + tokens;
    total += tokens;
  }

  if (total === 0) {
    return null;
  }

  return {
    timestamp: Date.now(),
    total,
    byAgent,
  };
}
