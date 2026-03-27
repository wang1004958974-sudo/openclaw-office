import type { ChatDockMessage } from "@/store/console-stores/chat-dock-store";
import type { SessionInfo } from "@/gateway/adapter-types";

interface ServerCacheMessagesResponse {
  messages: ChatDockMessage[];
  sessionKey: string;
  agentId: string | null;
  cachedAt: number | null;
}

interface ServerCacheSessionsResponse {
  sessions: SessionInfo[];
  cachedAt: number | null;
}

const BASE_URL = "/api/chat-cache";
const SAVE_DEBOUNCE_MS = 2000;

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    throw new Error(`Server cache API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

function debouncedSave(key: string, fn: () => Promise<void>): void {
  const existing = pendingSaves.get(key);
  if (existing) clearTimeout(existing);
  pendingSaves.set(
    key,
    setTimeout(() => {
      pendingSaves.delete(key);
      fn().catch(() => {});
    }, SAVE_DEBOUNCE_MS),
  );
}

export const serverPersistence = {
  async getMessages(sessionKey: string): Promise<ChatDockMessage[]> {
    try {
      const result = await fetchJson<ServerCacheMessagesResponse>(
        `${BASE_URL}/messages?sessionKey=${encodeURIComponent(sessionKey)}`,
      );
      return result.messages ?? [];
    } catch {
      return [];
    }
  },

  saveMessages(sessionKey: string, messages: ChatDockMessage[], agentId?: string | null): void {
    debouncedSave(`msg:${sessionKey}`, () =>
      fetchJson(`${BASE_URL}/messages`, {
        method: "PUT",
        body: JSON.stringify({ sessionKey, messages, agentId: agentId ?? null }),
      }),
    );
  },

  saveMessagesImmediate(sessionKey: string, messages: ChatDockMessage[], agentId?: string | null): void {
    const existing = pendingSaves.get(`msg:${sessionKey}`);
    if (existing) {
      clearTimeout(existing);
      pendingSaves.delete(`msg:${sessionKey}`);
    }
    void fetchJson(`${BASE_URL}/messages`, {
      method: "PUT",
      body: JSON.stringify({ sessionKey, messages, agentId: agentId ?? null }),
    }).catch(() => {});
  },

  async clearMessages(sessionKey: string): Promise<void> {
    const existing = pendingSaves.get(`msg:${sessionKey}`);
    if (existing) {
      clearTimeout(existing);
      pendingSaves.delete(`msg:${sessionKey}`);
    }
    try {
      await fetchJson(`${BASE_URL}/messages?sessionKey=${encodeURIComponent(sessionKey)}`, {
        method: "DELETE",
      });
    } catch {
      // Silent fail.
    }
  },

  async getSessions(): Promise<ServerCacheSessionsResponse> {
    try {
      return await fetchJson<ServerCacheSessionsResponse>(`${BASE_URL}/sessions`);
    } catch {
      return { sessions: [], cachedAt: null };
    }
  },

  saveSessions(sessions: SessionInfo[]): void {
    debouncedSave("sessions", () =>
      fetchJson(`${BASE_URL}/sessions`, {
        method: "PUT",
        body: JSON.stringify({ sessions }),
      }),
    );
  },
};
