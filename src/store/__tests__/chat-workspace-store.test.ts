import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetAdapterForTests, getAdapter, initAdapter } from "@/gateway/adapter-provider";
import { localPersistence } from "@/lib/local-persistence";
import { useChatDockStore } from "../console-stores/chat-dock-store";

function resetChatStore() {
  localStorage.removeItem("openclaw-office-chat-page:last-session");
  useChatDockStore.setState({
    messages: [],
    isStreaming: false,
    currentSessionKey: "agent:main:main",
    dockExpanded: false,
    targetAgentId: null,
    sessions: [],
    error: null,
    activeRunId: null,
    streamingMessage: null,
    isHistoryLoaded: false,
    isHistoryLoading: false,
    draft: "",
    attachments: [],
    queue: [],
    focusMode: false,
    searchQuery: "",
    pinnedMessageIds: [],
    thinkingLevel: null,
  });
}

describe("Chat workspace store", () => {
  beforeEach(async () => {
    __resetAdapterForTests();
    await initAdapter("mock");
    vi.restoreAllMocks();
    resetChatStore();
  });

  it("initializes history with thinking level and messages", async () => {
    await useChatDockStore.getState().initializeHistory();
    const state = useChatDockStore.getState();
    expect(state.messages.length).toBeGreaterThan(0);
    expect(state.thinkingLevel).toBe("medium");
    expect(state.isHistoryLoaded).toBe(true);
  });

  it("creates a new session and keeps it active", () => {
    useChatDockStore.getState().newSession("main");
    const state = useChatDockStore.getState();
    expect(state.currentSessionKey).toContain("agent:main:session-");
    expect(state.sessions[0]?.key).toBe(state.currentSessionKey);
  });

  it("switches target agent when selecting a different session", () => {
    useChatDockStore.setState({
      sessions: [
        {
          key: "agent:coder:session-1",
          agentId: "coder",
          label: "coder",
          createdAt: 1,
          lastActiveAt: 2,
          messageCount: 3,
        },
      ],
    });

    useChatDockStore.getState().switchSession("agent:coder:session-1");

    const state = useChatDockStore.getState();
    expect(state.currentSessionKey).toBe("agent:coder:session-1");
    expect(state.targetAgentId).toBe("coder");
  });

  it("prefers an existing gateway session when changing the target agent", () => {
    useChatDockStore.setState({
      sessions: [
        {
          key: "agent:coder:session-old",
          agentId: "coder",
          label: "old",
          createdAt: 1,
          lastActiveAt: 10,
          messageCount: 2,
        },
        {
          key: "agent:coder:session-new",
          agentId: "coder",
          label: "new",
          createdAt: 2,
          lastActiveAt: 20,
          messageCount: 5,
        },
      ],
    });

    useChatDockStore.getState().setTargetAgent("coder");

    const state = useChatDockStore.getState();
    expect(state.targetAgentId).toBe("coder");
    expect(state.currentSessionKey).toBe("agent:coder:session-new");
  });

  it("creates a fresh workspace session when only main or channel sessions exist", () => {
    useChatDockStore.setState({
      sessions: [
        {
          key: "agent:coder:main",
          agentId: "coder",
          label: "main",
          createdAt: 1,
          lastActiveAt: 10,
          messageCount: 200,
        },
        {
          key: "agent:coder:feishu:direct:test-user",
          agentId: "coder",
          label: "channel",
          createdAt: 2,
          lastActiveAt: 20,
          messageCount: 3,
        },
      ],
    });

    useChatDockStore.getState().setTargetAgent("coder");

    const state = useChatDockStore.getState();
    expect(state.targetAgentId).toBe("coder");
    expect(state.currentSessionKey).toMatch(/^agent:coder:session-\d+$/u);
  });

  it("shows cached sessions immediately and refreshes from gateway", async () => {
    vi.spyOn(localPersistence, "getSessions").mockResolvedValue({
      sessions: [
        {
          key: "agent:main:main",
          agentId: "main",
          label: "cached",
          createdAt: 1,
          lastActiveAt: Date.now(),
          messageCount: 7,
        },
      ],
      cachedAt: Date.now(),
    });
    const sessionsListSpy = vi.spyOn(getAdapter(), "sessionsList");

    await useChatDockStore.getState().loadSessions();

    expect(sessionsListSpy).toHaveBeenCalled();
    const sessions = useChatDockStore.getState().sessions;
    expect(sessions.length).toBeGreaterThan(0);
  });

  it("shows cached messages immediately then refreshes from gateway", async () => {
    vi.spyOn(localPersistence, "getMessages").mockResolvedValue([
      {
        id: "cached-1",
        role: "assistant",
        content: "cached reply",
        timestamp: 123,
        authorAgentId: "main",
      },
    ]);
    const historySpy = vi.spyOn(getAdapter(), "chatHistory");

    await useChatDockStore.getState().initializeHistory();

    expect(historySpy).toHaveBeenCalled();
    expect(useChatDockStore.getState().isHistoryLoaded).toBe(true);
  });

  it("queues outbound messages while streaming", async () => {
    useChatDockStore.setState({ isStreaming: true });
    await useChatDockStore.getState().sendMessage("queued while busy");
    const state = useChatDockStore.getState();
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]?.text).toBe("queued while busy");
  });

  it("handles local slash commands through shared state", async () => {
    await useChatDockStore.getState().sendMessage("/focus");
    const state = useChatDockStore.getState();
    expect(state.focusMode).toBe(true);
    expect(state.messages.at(-1)?.content).toContain("专注模式");
  });

  it("records tool activity from agent events as a single collapsible item", () => {
    useChatDockStore.getState().handleAgentEvent({
      runId: "run-1",
      seq: 1,
      stream: "tool",
      ts: Date.now(),
      sessionKey: "agent:main:main",
      data: { phase: "start", name: "mock_search", args: { query: "hello" } },
    });
    useChatDockStore.getState().handleAgentEvent({
      runId: "run-1",
      seq: 2,
      stream: "tool",
      ts: Date.now(),
      sessionKey: "agent:main:main",
      data: { phase: "end", name: "mock_search" },
    });

    const state = useChatDockStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages.at(-1)?.kind).toBe("tool");
    expect(state.messages.at(-1)?.toolCalls?.[0]?.name).toBe("mock_search");
    expect(state.messages.at(-1)?.toolCalls?.[0]?.status).toBe("done");
  });

  it("embeds tool activity between assistant text segments in time order", () => {
    useChatDockStore.getState().handleChatEvent({
      state: "delta",
      runId: "run-seq",
      message: {
        role: "assistant",
        content: "先看一下仓库结构",
      },
    });

    useChatDockStore.getState().handleAgentEvent({
      runId: "run-seq",
      seq: 1,
      stream: "tool",
      ts: Date.now(),
      sessionKey: "agent:main:main",
      data: { phase: "start", name: "read", args: { path: "README.md" } },
    });

    useChatDockStore.getState().handleAgentEvent({
      runId: "run-seq",
      seq: 2,
      stream: "tool",
      ts: Date.now(),
      sessionKey: "agent:main:main",
      data: { phase: "end", name: "read" },
    });

    useChatDockStore.getState().handleChatEvent({
      state: "final",
      runId: "run-seq",
      message: {
        id: "assistant-final",
        role: "assistant",
        content: "先看一下仓库结构\n\n接着给出修改建议",
        stopReason: "end_turn",
      },
    });

    const state = useChatDockStore.getState();
    expect(state.messages).toHaveLength(3);
    expect(state.messages[0]?.role).toBe("assistant");
    expect(state.messages[0]?.content).toContain("先看一下仓库结构");
    expect(state.messages[1]?.kind).toBe("tool");
    expect(state.messages[1]?.toolCalls?.[0]?.status).toBe("done");
    expect(state.messages[2]?.role).toBe("assistant");
    expect(state.messages[2]?.content).toContain("接着给出修改建议");
  });
});
