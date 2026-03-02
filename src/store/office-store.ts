import { enableMapSet } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { parseAgentEvent } from "@/gateway/event-parser";

enableMapSet();
import type {
  AgentEventPayload,
  AgentSummary,
  AgentToAgentConfig,
  AgentVisualStatus,
  CollaborationLink,
  ConnectionStatus,
  EventHistoryItem,
  OfficeStore,
  PageId,
  SessionSnapshot,
  SubAgentInfo,
  ThemeMode,
  TokenSnapshot,
  ViewMode,
  VisualAgent,
} from "@/gateway/types";
import { allocatePosition, calculateLoungePositions } from "@/lib/position-allocator";
import { applyEventToAgent } from "./agent-reducer";
import { applyMeetingGathering, detectMeetingGroups } from "./meeting-manager";
import { computeMetrics } from "./metrics-reducer";

const EVENT_HISTORY_LIMIT = 200;
const LINK_TIMEOUT_MS = 60_000;
const THEME_STORAGE_KEY = "openclaw-theme";
const CHAT_DOCK_HEIGHT_KEY = "openclaw-chat-dock-height";
const DEFAULT_CHAT_DOCK_HEIGHT = 300;
const LOUNGE_TO_HOTDESK_DEBOUNCE_MS = 500;
const HOTDESK_TO_LOUNGE_DELAY_MS = 30_000;

const zoneMigrationTimers = new Map<string, ReturnType<typeof setTimeout>>();
let meetingGatheringTimer: ReturnType<typeof setTimeout> | null = null;
let lastMeetingGroupsHash = "";
const MEETING_GATHERING_THROTTLE_MS = 500;

function isActiveStatus(status: AgentVisualStatus): boolean {
  return status === "thinking" || status === "tool_calling" || status === "speaking" || status === "spawning";
}

function getInitialChatDockHeight(): number {
  if (typeof window === "undefined") return DEFAULT_CHAT_DOCK_HEIGHT;
  const stored = localStorage.getItem(CHAT_DOCK_HEIGHT_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!Number.isNaN(parsed) && parsed >= 150 && parsed <= 800) return parsed;
  }
  return DEFAULT_CHAT_DOCK_HEIGHT;
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return "dark";
}

function getInitialBloom(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.devicePixelRatio >= 1.5;
}

function createVisualAgent(
  id: string,
  name: string,
  isSubAgent: boolean,
  occupied: Set<string>,
): VisualAgent {
  const position = allocatePosition(id, isSubAgent, occupied);
  return {
    id,
    name,
    status: "idle" as AgentVisualStatus,
    position,
    currentTool: null,
    speechBubble: null,
    lastActiveAt: Date.now(),
    toolCallCount: 0,
    toolCallHistory: [],
    runId: null,
    isSubAgent,
    parentAgentId: null,
    childAgentIds: [],
    zone: "desk" as const,
    originalPosition: null,
  };
}

function positionKey(pos: { x: number; y: number }): string {
  return `${pos.x},${pos.y}`;
}

export const useOfficeStore = create<OfficeStore>()(
  immer((set) => ({
    agents: new Map(),
    links: [],
    globalMetrics: {
      activeAgents: 0,
      totalAgents: 0,
      totalTokens: 0,
      tokenRate: 0,
      collaborationHeat: 0,
    },
    connectionStatus: "disconnected" as ConnectionStatus,
    connectionError: null,
    selectedAgentId: null,
    viewMode: "2d" as ViewMode,
    eventHistory: [],
    sidebarCollapsed: false,
    lastSessionsSnapshot: null,
    theme: getInitialTheme(),
    bloomEnabled: getInitialBloom(),
    operatorScopes: [] as string[],
    tokenHistory: [] as TokenSnapshot[],
    agentCosts: {} as Record<string, number>,
    currentPage: "office" as PageId,
    chatDockHeight: getInitialChatDockHeight(),
    maxSubAgents: 8,
    agentToAgentConfig: { enabled: false, allow: [] } as AgentToAgentConfig,
    runIdMap: new Map(),
    sessionKeyMap: new Map(),

    addAgent: (agent: VisualAgent) => {
      set((state) => {
        state.agents.set(agent.id, agent);
        state.globalMetrics = computeMetrics(state.agents, state.globalMetrics);
      });
    },

    updateAgent: (id: string, patch: Partial<VisualAgent>) => {
      set((state) => {
        const agent = state.agents.get(id);
        if (agent) {
          Object.assign(agent, patch);
          state.globalMetrics = computeMetrics(state.agents, state.globalMetrics);
        }
      });
    },

    removeAgent: (id: string) => {
      set((state) => {
        state.agents.delete(id);
        if (state.selectedAgentId === id) {
          state.selectedAgentId = null;
        }
        state.globalMetrics = computeMetrics(state.agents, state.globalMetrics);
      });
    },

    addSubAgent: (parentId: string, info: SubAgentInfo) => {
      set((state) => {
        const occupied = new Set<string>();
        for (const a of state.agents.values()) {
          occupied.add(positionKey(a.position));
        }
        const agent = createVisualAgent(
          info.agentId,
          info.label || `Sub-${info.agentId.slice(0, 6)}`,
          true,
          occupied,
        );
        agent.parentAgentId = parentId;
        agent.runId = info.sessionKey;

        // Assign to lounge zone initially; migrate to hotDesk when active
        const loungePositions = calculateLoungePositions(state.maxSubAgents);
        const loungeOccupied = new Set<string>();
        for (const a of state.agents.values()) {
          if (a.zone === "lounge") {
            loungeOccupied.add(positionKey(a.position));
          }
        }
        const freeLounge = loungePositions.find((p) => !loungeOccupied.has(positionKey(p)));
        if (freeLounge) {
          agent.zone = "lounge";
          agent.position = freeLounge;
        } else {
          agent.zone = "hotDesk";
        }

        state.agents.set(info.agentId, agent);

        const parent = state.agents.get(parentId);
        if (parent) {
          parent.childAgentIds.push(info.agentId);
        }
        state.globalMetrics = computeMetrics(state.agents, state.globalMetrics);
      });
    },

    removeSubAgent: (subAgentId: string) => {
      set((state) => {
        const sub = state.agents.get(subAgentId);
        if (sub?.parentAgentId) {
          const parent = state.agents.get(sub.parentAgentId);
          if (parent) {
            parent.childAgentIds = parent.childAgentIds.filter((id) => id !== subAgentId);
          }
        }
        state.agents.delete(subAgentId);
        if (state.selectedAgentId === subAgentId) {
          state.selectedAgentId = null;
        }
        state.globalMetrics = computeMetrics(state.agents, state.globalMetrics);
      });
    },

    moveToMeeting: (agentId: string, meetingPosition: { x: number; y: number }) => {
      set((state) => {
        const agent = state.agents.get(agentId);
        if (agent) {
          agent.originalPosition = { ...agent.position };
          agent.position = meetingPosition;
          agent.zone = "meeting";
        }
      });
    },

    returnFromMeeting: (agentId: string) => {
      set((state) => {
        const agent = state.agents.get(agentId);
        if (agent?.originalPosition) {
          agent.position = { ...agent.originalPosition };
          agent.zone = agent.isSubAgent ? "hotDesk" : "desk";
          agent.originalPosition = null;
        }
      });
    },

    setSessionsSnapshot: (snapshot: SessionSnapshot) => {
      set((state) => {
        state.lastSessionsSnapshot = snapshot;
      });
    },

    initAgents: (summaries: AgentSummary[]) => {
      set((state) => {
        state.agents.clear();
        state.runIdMap.clear();
        state.sessionKeyMap.clear();

        const occupied = new Set<string>();
        for (const summary of summaries) {
          const name = summary.identity?.name ?? summary.name ?? summary.id;
          const agent = createVisualAgent(summary.id, name, false, occupied);
          occupied.add(positionKey(agent.position));
          state.agents.set(summary.id, agent);
        }

        state.globalMetrics = computeMetrics(state.agents, state.globalMetrics);
      });
    },

    processAgentEvent: (event: AgentEventPayload) => {
      set((state) => {
        const parsed = parseAgentEvent(event);

        // Resolve agentId from runId
        let agentId = state.runIdMap.get(event.runId);

        if (!agentId && event.sessionKey) {
          const sessionAgents = state.sessionKeyMap.get(event.sessionKey);
          if (sessionAgents && sessionAgents.length > 0) {
            agentId = sessionAgents[0];
          }
        }

        if (!agentId) {
          // Create temporary agent for unknown runId
          agentId = event.runId;
          if (!state.agents.has(agentId)) {
            const occupied = new Set<string>();
            for (const a of state.agents.values()) {
              occupied.add(positionKey(a.position));
            }
            const agent = createVisualAgent(
              agentId,
              `Agent-${agentId.slice(0, 6)}`,
              true,
              occupied,
            );
            agent.runId = event.runId;
            state.agents.set(agentId, agent);
          }
        }

        state.runIdMap.set(event.runId, agentId);

        if (event.sessionKey) {
          const existing = state.sessionKeyMap.get(event.sessionKey) ?? [];
          if (!existing.includes(agentId)) {
            existing.push(agentId);
            state.sessionKeyMap.set(event.sessionKey, existing);
          }
          updateCollaborationLinks(state, event.sessionKey, agentId);

          if (state.agentToAgentConfig.enabled) {
            scheduleMeetingGathering();
          }
        }

        const agent = state.agents.get(agentId);
        if (agent) {
          const prevStatus = agent.status;
          applyEventToAgent(agent, parsed);

          // Zone migration: lounge ↔ hotDesk for sub-agents
          if (agent.isSubAgent && agent.zone !== "meeting") {
            scheduleZoneMigration(agent.id, prevStatus, agent.status);
          }
        }

        // Event history
        const historyItem: EventHistoryItem = {
          timestamp: event.ts,
          agentId,
          agentName: agent?.name ?? agentId,
          stream: event.stream,
          summary: parsed.summary,
        };
        state.eventHistory.push(historyItem);
        if (state.eventHistory.length > EVENT_HISTORY_LIMIT) {
          state.eventHistory = state.eventHistory.slice(-EVENT_HISTORY_LIMIT);
        }

        state.globalMetrics = computeMetrics(state.agents, state.globalMetrics);
      });
    },

    selectAgent: (id: string | null) => {
      set((state) => {
        state.selectedAgentId = state.selectedAgentId === id ? null : id;
      });
    },

    setViewMode: (mode: ViewMode) => {
      set((state) => {
        state.viewMode = mode;
      });
    },

    setConnectionStatus: (status: ConnectionStatus, error?: string) => {
      set((state) => {
        state.connectionStatus = status;
        state.connectionError = error ?? null;
      });
    },

    setSidebarCollapsed: (collapsed: boolean) => {
      set((state) => {
        state.sidebarCollapsed = collapsed;
      });
    },

    setTheme: (theme: ThemeMode) => {
      set((state) => {
        state.theme = theme;
      });
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // localStorage unavailable
      }
    },

    setBloomEnabled: (enabled: boolean) => {
      set((state) => {
        state.bloomEnabled = enabled;
      });
    },

    setOperatorScopes: (scopes: string[]) => {
      set((state) => {
        state.operatorScopes = scopes;
      });
    },

    pushTokenSnapshot: (snapshot: TokenSnapshot) => {
      set((state) => {
        state.tokenHistory.push(snapshot);
        if (state.tokenHistory.length > 30) {
          state.tokenHistory = state.tokenHistory.slice(-30);
        }
      });
    },

    setAgentCosts: (costs: Record<string, number>) => {
      set((state) => {
        state.agentCosts = costs;
      });
    },

    setCurrentPage: (page: PageId) => {
      set((state) => {
        state.currentPage = page;
      });
    },

    setChatDockHeight: (height: number) => {
      set((state) => {
        state.chatDockHeight = height;
      });
      try {
        localStorage.setItem(CHAT_DOCK_HEIGHT_KEY, String(height));
      } catch {
        // localStorage unavailable
      }
    },

    setMaxSubAgents: (n: number) => {
      set((state) => {
        if (n >= 1 && n <= 50) {
          state.maxSubAgents = n;
        }
      });
    },

    setAgentToAgentConfig: (config: AgentToAgentConfig) => {
      set((state) => {
        state.agentToAgentConfig = config;
      });
    },

    updateMetrics: () => {
      set((state) => {
        state.globalMetrics = computeMetrics(state.agents, state.globalMetrics);
      });
    },
  })),
);

function updateCollaborationLinks(
  state: { links: CollaborationLink[]; sessionKeyMap: Map<string, string[]> },
  sessionKey: string,
  agentId: string,
): void {
  const agents = state.sessionKeyMap.get(sessionKey);
  if (!agents || agents.length < 2) {
    return;
  }

  const now = Date.now();
  for (const otherId of agents) {
    if (otherId === agentId) {
      continue;
    }

    const existingIdx = state.links.findIndex(
      (l) =>
        l.sessionKey === sessionKey &&
        ((l.sourceId === agentId && l.targetId === otherId) ||
          (l.sourceId === otherId && l.targetId === agentId)),
    );

    if (existingIdx >= 0) {
      const link = state.links[existingIdx];
      link.lastActivityAt = now;
      link.strength = Math.min(link.strength + 0.1, 1);
    } else {
      state.links.push({
        sourceId: agentId,
        targetId: otherId,
        sessionKey,
        strength: 0.3,
        lastActivityAt: now,
      });
    }
  }

  // Decay stale links
  state.links = state.links.filter((l) => now - l.lastActivityAt < LINK_TIMEOUT_MS);
}

function scheduleMeetingGathering(): void {
  if (meetingGatheringTimer) return;
  meetingGatheringTimer = setTimeout(() => {
    meetingGatheringTimer = null;
    const state = useOfficeStore.getState();
    if (!state.agentToAgentConfig.enabled) return;

    const groups = detectMeetingGroups(
      state.links,
      state.agents,
      state.agentToAgentConfig.allow,
    );
    const hash = JSON.stringify(groups.map((g) => g.agentIds.sort()));
    if (hash === lastMeetingGroupsHash) return;
    lastMeetingGroupsHash = hash;

    applyMeetingGathering(
      state.agents,
      groups,
      (id, pos) => useOfficeStore.getState().moveToMeeting(id, pos),
      (id) => useOfficeStore.getState().returnFromMeeting(id),
    );
  }, MEETING_GATHERING_THROTTLE_MS);
}

function scheduleZoneMigration(
  agentId: string,
  prevStatus: AgentVisualStatus,
  newStatus: AgentVisualStatus,
): void {
  const existingTimer = zoneMigrationTimers.get(agentId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    zoneMigrationTimers.delete(agentId);
  }

  const wasActive = isActiveStatus(prevStatus);
  const nowActive = isActiveStatus(newStatus);

  if (!wasActive && nowActive) {
    // lounge → hotDesk with debounce
    const timer = setTimeout(() => {
      zoneMigrationTimers.delete(agentId);
      migrateAgentToHotDesk(agentId);
    }, LOUNGE_TO_HOTDESK_DEBOUNCE_MS);
    zoneMigrationTimers.set(agentId, timer);
  } else if (wasActive && !nowActive && newStatus === "idle") {
    // hotDesk → lounge after sustained idle
    const timer = setTimeout(() => {
      zoneMigrationTimers.delete(agentId);
      migrateAgentToLounge(agentId);
    }, HOTDESK_TO_LOUNGE_DELAY_MS);
    zoneMigrationTimers.set(agentId, timer);
  }
}

function migrateAgentToHotDesk(agentId: string): void {
  const state = useOfficeStore.getState();
  const agent = state.agents.get(agentId);
  if (!agent || !agent.isSubAgent || agent.zone !== "lounge") return;

  const occupied = new Set<string>();
  for (const a of state.agents.values()) {
    if (a.zone === "hotDesk") {
      occupied.add(positionKey(a.position));
    }
  }
  const hotDeskPos = allocatePosition(agentId, true, occupied);

  useOfficeStore.setState((draft) => {
    const a = draft.agents.get(agentId);
    if (a) {
      a.zone = "hotDesk";
      a.position = hotDeskPos;
    }
  });
}

function migrateAgentToLounge(agentId: string): void {
  const state = useOfficeStore.getState();
  const agent = state.agents.get(agentId);
  if (!agent || !agent.isSubAgent || agent.zone !== "hotDesk") return;
  if (isActiveStatus(agent.status)) return;

  const loungePositions = calculateLoungePositions(state.maxSubAgents);
  const loungeOccupied = new Set<string>();
  for (const a of state.agents.values()) {
    if (a.zone === "lounge") {
      loungeOccupied.add(positionKey(a.position));
    }
  }
  const freeLounge = loungePositions.find((p) => !loungeOccupied.has(positionKey(p)));
  if (!freeLounge) return;

  useOfficeStore.setState((draft) => {
    const a = draft.agents.get(agentId);
    if (a) {
      a.zone = "lounge";
      a.position = freeLounge;
    }
  });
}
