import { describe, expect, it } from "vitest";
import type { UsageInfo } from "@/gateway/adapter-types";
import { __test__ } from "@/store/console-stores/ai-accounts-store";

describe("ai-accounts-store helpers", () => {
  it("marks provider accounts with usage windows as ok", () => {
    const usage: UsageInfo = {
      updatedAt: 1_700_000_000_000,
      providers: [
        {
          provider: "openai",
          displayName: "OpenAI",
          windows: [{ label: "daily", usedPercent: 25 }],
        },
      ],
    };

    const account = __test__.normalizeProviderAccount(
      "openai",
      {
        apiKey: "__OPENCLAW_REDACTED__",
        api: "openai-responses",
        models: [{ id: "gpt-4o" }],
      },
      usage,
      [{ provider: "openai", totals: { totalCost: 12.34, totalTokens: 1234 } }],
      [{ provider: "openai", model: "gpt-4o", totals: { totalCost: 12.34, totalTokens: 1234 } }],
    );

    expect(account.status).toBe("ok");
    expect(account.costState).toBe("ok");
    expect(account.lastCheckedAt).toBe(usage.updatedAt);
  });

  it("does not attach provider-level cost aggregates to auth accounts", () => {
    const usage: UsageInfo = {
      updatedAt: 1_700_000_000_000,
      providers: [
        {
          provider: "openai",
          displayName: "OpenAI",
          windows: [{ label: "daily", usedPercent: 40 }],
        },
      ],
    };

    const account = __test__.normalizeAuthAccount(
      "work-openai",
      {
        provider: "openai",
        mode: "oauth",
        email: "dev@example.com",
      },
      usage,
      [{ provider: "openai", totals: { totalCost: 12.34, totalTokens: 1234 } }],
      [{ provider: "openai", model: "gpt-4o", totals: { totalCost: 12.34, totalTokens: 1234 } }],
    );

    expect(account.status).toBe("ok");
    expect(account.estimatedCost).toBeUndefined();
    expect(account.estimatedTokens).toBeUndefined();
    expect(account.topModels).toBeUndefined();
    expect(account.costState).toBe("unavailable");
  });

  it("leaves auth lastCheckedAt empty when no usage data is available", () => {
    const account = __test__.normalizeAuthAccount(
      "work-openai",
      {
        provider: "openai",
        mode: "oauth",
        email: "dev@example.com",
      },
      undefined,
      [],
      [],
    );

    expect(account.lastCheckedAt).toBeUndefined();
    expect(account.status).toBe("warning");
  });
});
