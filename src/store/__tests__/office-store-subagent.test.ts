import { describe, it, expect, beforeEach } from "vitest";
import type { SubAgentInfo } from "@/gateway/types";
import { useOfficeStore } from "@/store/office-store";

function resetStore() {
  useOfficeStore.setState({
    agents: new Map(),
    links: [],
    globalMetrics: {
      activeAgents: 0,
      totalAgents: 0,
      totalTokens: 0,
      tokenRate: 0,
      collaborationHeat: 0,
    },
    connectionStatus: "disconnected",
    connectionError: null,
    selectedAgentId: null,
    viewMode: "2d",
    eventHistory: [],
    sidebarCollapsed: false,
    lastSessionsSnapshot: null,
    maxSubAgents: 8,
    agentToAgentConfig: { enabled: false, allow: [] },
    runIdMap: new Map(),
    sessionKeyMap: new Map(),
  });
}

function mkSubInfo(id: string): SubAgentInfo {
  return {
    sessionKey: `session-${id}`,
    agentId: id,
    label: `Sub-${id}`,
    task: "research",
    requesterSessionKey: "parent-session",
    startedAt: Date.now(),
  };
}

describe("office-store Sub-Agent management", () => {
  beforeEach(() => {
    resetStore();
    useOfficeStore.getState().initAgents([{ id: "parent", name: "ParentBot" }]);
  });

  it("addSubAgent creates sub-agent with correct parent relationship", () => {
    const { addSubAgent } = useOfficeStore.getState();
    addSubAgent("parent", mkSubInfo("sub1"));

    const state = useOfficeStore.getState();
    const sub = state.agents.get("sub1");
    expect(sub).toBeDefined();
    expect(sub?.isSubAgent).toBe(true);
    expect(sub?.parentAgentId).toBe("parent");
    expect(sub?.zone).toBe("lounge");

    const parent = state.agents.get("parent");
    expect(parent?.childAgentIds).toContain("sub1");
  });

  it("removeSubAgent cleans up parent-child relationship", () => {
    const { addSubAgent, removeSubAgent } = useOfficeStore.getState();
    addSubAgent("parent", mkSubInfo("sub1"));
    removeSubAgent("sub1");

    const state = useOfficeStore.getState();
    expect(state.agents.has("sub1")).toBe(false);
    expect(state.agents.get("parent")?.childAgentIds).not.toContain("sub1");
  });

  it("removeSubAgent clears selectedAgentId if selected", () => {
    const { addSubAgent, selectAgent, removeSubAgent } = useOfficeStore.getState();
    addSubAgent("parent", mkSubInfo("sub1"));
    selectAgent("sub1");
    expect(useOfficeStore.getState().selectedAgentId).toBe("sub1");

    removeSubAgent("sub1");
    expect(useOfficeStore.getState().selectedAgentId).toBeNull();
  });

  it("moveToMeeting saves original position and updates zone", () => {
    const { moveToMeeting } = useOfficeStore.getState();
    const parent = useOfficeStore.getState().agents.get("parent")!;
    const origPos = { ...parent.position };

    moveToMeeting("parent", { x: 890, y: 190 });

    const updated = useOfficeStore.getState().agents.get("parent")!;
    expect(updated.originalPosition).toEqual(origPos);
    expect(updated.position).toEqual({ x: 890, y: 190 });
    expect(updated.zone).toBe("meeting");
  });

  it("returnFromMeeting restores original position", () => {
    const { moveToMeeting, returnFromMeeting } = useOfficeStore.getState();
    const origPos = { ...useOfficeStore.getState().agents.get("parent")!.position };

    moveToMeeting("parent", { x: 890, y: 190 });
    returnFromMeeting("parent");

    const restored = useOfficeStore.getState().agents.get("parent")!;
    expect(restored.position).toEqual(origPos);
    expect(restored.originalPosition).toBeNull();
    expect(restored.zone).toBe("desk");
  });

  it("setSessionsSnapshot stores snapshot", () => {
    const { setSessionsSnapshot } = useOfficeStore.getState();
    const snapshot = { sessions: [mkSubInfo("s1")], fetchedAt: Date.now() };
    setSessionsSnapshot(snapshot);

    expect(useOfficeStore.getState().lastSessionsSnapshot).toEqual(snapshot);
  });

  it("initAgents sets correct Phase 2 default field values", () => {
    const agent = useOfficeStore.getState().agents.get("parent")!;
    expect(agent.parentAgentId).toBeNull();
    expect(agent.childAgentIds).toEqual([]);
    expect(agent.zone).toBe("desk");
    expect(agent.originalPosition).toBeNull();
  });

  it("addSubAgent assigns lounge zone and lounge position", () => {
    const { addSubAgent } = useOfficeStore.getState();
    addSubAgent("parent", mkSubInfo("sub-lounge-1"));
    const sub = useOfficeStore.getState().agents.get("sub-lounge-1")!;
    expect(sub.zone).toBe("lounge");
    // Position should be within lounge zone bounds
    expect(sub.position.x).toBeGreaterThan(500);
    expect(sub.position.y).toBeGreaterThan(350);
  });

  it("returnFromMeeting returns sub-agent to hotDesk", () => {
    const { addSubAgent, updateAgent, moveToMeeting, returnFromMeeting } = useOfficeStore.getState();
    addSubAgent("parent", mkSubInfo("sub-meet"));
    updateAgent("sub-meet", { zone: "hotDesk" });

    moveToMeeting("sub-meet", { x: 890, y: 190 });
    returnFromMeeting("sub-meet");
    const restored = useOfficeStore.getState().agents.get("sub-meet")!;
    expect(restored.zone).toBe("hotDesk");
  });
});

describe("office-store config awareness", () => {
  beforeEach(() => {
    resetStore();
  });

  it("default maxSubAgents is 8", () => {
    expect(useOfficeStore.getState().maxSubAgents).toBe(8);
  });

  it("setMaxSubAgents updates value within range", () => {
    useOfficeStore.getState().setMaxSubAgents(12);
    expect(useOfficeStore.getState().maxSubAgents).toBe(12);
  });

  it("setMaxSubAgents rejects out-of-range values", () => {
    useOfficeStore.getState().setMaxSubAgents(0);
    expect(useOfficeStore.getState().maxSubAgents).toBe(8);
    useOfficeStore.getState().setMaxSubAgents(51);
    expect(useOfficeStore.getState().maxSubAgents).toBe(8);
  });

  it("default agentToAgentConfig is disabled", () => {
    const cfg = useOfficeStore.getState().agentToAgentConfig;
    expect(cfg.enabled).toBe(false);
    expect(cfg.allow).toEqual([]);
  });

  it("setAgentToAgentConfig updates config", () => {
    useOfficeStore.getState().setAgentToAgentConfig({
      enabled: true,
      allow: ["main", "coder"],
    });
    const cfg = useOfficeStore.getState().agentToAgentConfig;
    expect(cfg.enabled).toBe(true);
    expect(cfg.allow).toEqual(["main", "coder"]);
  });
});
