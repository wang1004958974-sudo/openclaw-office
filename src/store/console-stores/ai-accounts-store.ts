import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { waitForAdapter } from "@/gateway/adapter-provider";
import type { AiAccountUsageInfo, UsageInfo, UsageLimitWindow } from "@/gateway/adapter-types";
import { inferProviderType } from "@/lib/provider-types";

type ProviderConfig = Record<string, unknown>;
type AuthProfile = Record<string, unknown>;

export interface AiAccountGroup {
  key: string;
  providerKey: string;
  providerDisplayName: string;
  authAccounts: AiAccountUsageInfo[];
  providerAccounts: AiAccountUsageInfo[];
}

interface AiAccountsCostSummary {
  totalCost?: number;
  totalTokens?: number;
  latestDayCost?: number;
  latestDayTokens?: number;
}

interface ProviderCostRow {
  provider?: string;
  totals?: { totalCost?: number; totalTokens?: number; missingCostEntries?: number };
}

interface ModelCostRow {
  provider?: string;
  model?: string;
  totals?: { totalCost?: number; totalTokens?: number; missingCostEntries?: number };
}

function resolveCostState(totalTokens: number | undefined, totalCost: number | undefined) {
  if ((totalTokens ?? 0) > 0 && (totalCost ?? 0) <= 0) return "pricing-mismatch" as const;
  if ((totalCost ?? 0) > 0) return "ok" as const;
  return "unavailable" as const;
}

function resolveAccountStatus(params: {
  providerUsage?: UsageInfo["providers"][number];
  authType: AiAccountUsageInfo["authType"];
  hasCredentials?: boolean;
  costState?: AiAccountUsageInfo["costState"];
}): AiAccountUsageInfo["status"] {
  const { providerUsage, authType, hasCredentials = false, costState } = params;
  if ((providerUsage?.error ?? "").trim()) return "error";
  if ((providerUsage?.windows?.length ?? 0) > 0) return "ok";
  if (costState === "ok" || costState === "pricing-mismatch") return "warning";
  if (hasCredentials || authType === "oauth" || authType === "token" || authType === "session") return "warning";
  return "error";
}

interface AiAccountsState {
  accounts: AiAccountUsageInfo[];
  groups: AiAccountGroup[];
  costSummary: AiAccountsCostSummary | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  fetchAccounts: () => Promise<void>;
  refresh: () => Promise<void>;
}

function getProvidersFromConfig(config: Record<string, unknown> | undefined): Record<string, ProviderConfig> {
  const models = config?.models as Record<string, unknown> | undefined;
  const providers = models?.providers as Record<string, ProviderConfig> | undefined;
  return providers ?? {};
}

function getAuthProfilesFromConfig(config: Record<string, unknown> | undefined): Record<string, AuthProfile> {
  const auth = config?.auth as Record<string, unknown> | undefined;
  const profiles = auth?.profiles as Record<string, AuthProfile> | undefined;
  return profiles ?? {};
}

function maskSecret(value?: string): string | undefined {
  if (!value || value === "__OPENCLAW_REDACTED__") return value;
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function findProviderUsage(providerId: string, providerName: string | undefined, usage?: UsageInfo) {
  const keys = new Set([
    providerId,
    providerName || "",
    canonicalProviderKey(providerId),
    canonicalProviderKey(providerName),
  ].filter(Boolean));
  return usage?.providers?.find((p) => keys.has(p.provider) || keys.has(canonicalProviderKey(p.provider)));
}

function resolveQuotaMode(providerUsage: UsageInfo["providers"][number] | undefined, authType: AiAccountUsageInfo["authType"]) {
  if (providerUsage?.windows?.length) return "official" as const;
  if (authType === "apiKey") return "local" as const;
  return "unavailable" as const;
}

function findProviderCost(providerId: string, providerName: string | undefined, rows: ProviderCostRow[] | undefined) {
  const keys = new Set([
    providerId,
    providerName || "",
    canonicalProviderKey(providerId),
    canonicalProviderKey(providerName),
  ].filter(Boolean));
  return rows?.find((row) => keys.has(row.provider || "") || keys.has(canonicalProviderKey(row.provider)));
}

function findTopModels(providerId: string, providerName: string | undefined, rows: ModelCostRow[] | undefined) {
  const keys = new Set([
    providerId,
    providerName || "",
    canonicalProviderKey(providerId),
    canonicalProviderKey(providerName),
  ].filter(Boolean));
  return (rows ?? [])
    .filter((row) => keys.has(row.provider || "") || keys.has(canonicalProviderKey(row.provider)))
    .map((row) => ({ model: row.model || "unknown", cost: row.totals?.totalCost, tokens: row.totals?.totalTokens, missingCostEntries: row.totals?.missingCostEntries }))
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
    .slice(0, 3);
}

function normalizeProviderAccount(providerId: string, provider: ProviderConfig, usage?: UsageInfo, providerCosts?: ProviderCostRow[], modelCosts?: ModelCostRow[]): AiAccountUsageInfo {
  const baseUrl = typeof provider.baseUrl === "string" ? provider.baseUrl : undefined;
  const api = typeof provider.api === "string" ? provider.api : undefined;
  const apiKey = typeof provider.apiKey === "string" ? provider.apiKey : undefined;
  const models = Array.isArray(provider.models) ? provider.models : [];
  const meta = inferProviderType(providerId, api, baseUrl);

  const providerUsage = findProviderUsage(providerId, meta.id, usage);
  const windowsFromUsage: UsageLimitWindow[] =
    providerUsage?.windows?.map((w, index) => ({
      key: `${providerId}-${w.label}-${index}`,
      label: w.label,
      usedPercent: w.usedPercent,
      resetAt: w.resetAt,
      source: "derived",
      unit: "mixed",
    })) ?? [];

  const fallbackWindows: UsageLimitWindow[] = [
    {
      key: `${providerId}-quota-unavailable`,
      label: "Quota",
      source: "unavailable",
    },
  ];

  const identityHint = maskSecret(apiKey) || baseUrl || providerId;
  const hasApiKey = Boolean(apiKey);

  const authType = hasApiKey ? "apiKey" : "unknown";
  const providerCost = findProviderCost(providerId, meta.id, providerCosts);
  const topModels = findTopModels(providerId, meta.id, modelCosts);
  const costState = resolveCostState(providerCost?.totals?.totalTokens, providerCost?.totals?.totalCost);
  return {
    accountId: providerId,
    accountLabel: providerId,
    provider: meta.id,
    providerDisplayName: meta.name,
    source: "provider",
    plan: providerUsage?.plan,
    authType,
    quotaMode: resolveQuotaMode(providerUsage, authType),
    costState,
    estimatedCost: providerCost?.totals?.totalCost,
    estimatedTokens: providerCost?.totals?.totalTokens,
    missingCostEntries: providerCost?.totals?.missingCostEntries,
    topModels,
    status: resolveAccountStatus({ providerUsage, authType, hasCredentials: hasApiKey, costState }),
    identityHint,
    baseUrl,
    api,
    windows: windowsFromUsage.length > 0 ? windowsFromUsage : fallbackWindows,
    lastCheckedAt: usage?.updatedAt,
    error: windowsFromUsage.length > 0 ? undefined : "unavailable",
    modelCount: models.length,
  } as AiAccountUsageInfo;
}

function canonicalProviderKey(value?: string): string {
  const v = (value || "").toLowerCase();
  if (v.includes("custom-api-deepseek") || v === "deepseek") return "deepseek";
  if (v.includes("openai")) return "openai";
  if (v.includes("gemini") || v.includes("google")) return "google";
  if (v.includes("anthropic") || v.includes("claude")) return "anthropic";
  if (v.includes("openrouter")) return "openrouter";
  if (v.includes("deepseek")) return "deepseek";
  if (v.includes("codex")) return "openai";
  return v || "unknown";
}

function buildGroups(accounts: AiAccountUsageInfo[]): AiAccountGroup[] {
  const map = new Map<string, AiAccountGroup>();
  for (const account of accounts) {
    const key = canonicalProviderKey(account.provider || account.accountId || account.accountLabel);
    const existing = map.get(key) ?? {
      key,
      providerKey: key,
      providerDisplayName: account.providerDisplayName || key,
      authAccounts: [],
      providerAccounts: [],
    };
    if (account.source === "auth") existing.authAccounts.push(account);
    else existing.providerAccounts.push(account);
    if (!existing.providerDisplayName && account.providerDisplayName) {
      existing.providerDisplayName = account.providerDisplayName;
    }
    map.set(key, existing);
  }
  return Array.from(map.values());
}

function normalizeAuthAccount(profileKey: string, profile: AuthProfile, usage?: UsageInfo, _providerCosts?: ProviderCostRow[], _modelCosts?: ModelCostRow[]): AiAccountUsageInfo {
  const provider = typeof profile.provider === "string" ? profile.provider : "unknown";
  const mode = typeof profile.mode === "string" ? profile.mode : "unknown";
  const email = typeof profile.email === "string" ? profile.email : undefined;
  const meta = inferProviderType(provider, undefined, undefined);

  const providerUsage = findProviderUsage(profileKey, provider, usage);
  const windowsFromUsage: UsageLimitWindow[] =
    providerUsage?.windows?.map((w, index) => ({
      key: `${profileKey}-${w.label}-${index}`,
      label: w.label,
      usedPercent: w.usedPercent,
      resetAt: w.resetAt,
      source: "derived",
      unit: "mixed",
    })) ?? [];

  const authType = mode === "oauth" ? "oauth" : "unknown";
  const costState = "unavailable" as const;
  return {
    accountId: profileKey,
    accountLabel: email || profileKey,
    provider,
    providerDisplayName: meta.name,
    source: "auth",
    authType,
    quotaMode: resolveQuotaMode(providerUsage, authType),
    costState,
    topModels: undefined,
    status: resolveAccountStatus({ providerUsage, authType, hasCredentials: Boolean(email), costState }),
    identityHint: profileKey,
    email,
    plan: providerUsage?.plan,
    windows: windowsFromUsage.length > 0 ? windowsFromUsage : [
      {
        key: `${profileKey}-quota-unavailable`,
        label: "Quota",
        source: "unavailable",
      },
    ],
    error: windowsFromUsage.length > 0 ? undefined : "unavailable",
    lastCheckedAt: usage?.updatedAt,
  };
}

export const useAiAccountsStore = create<AiAccountsState>()(
  devtools(
    (set, get) => ({
      accounts: [],
      groups: [],
      costSummary: null,
      isLoading: false,
      error: null,
      lastUpdated: null,

      fetchAccounts: async () => {
        set({ isLoading: true, error: null });
        try {
          const adapter = await waitForAdapter();
          const [configSnap, usageInfo, costInfo, sessionsUsageInfo] = await Promise.all([
            adapter.configGet(),
            adapter.usageStatus().catch(() => ({ updatedAt: Date.now(), providers: [] }) as UsageInfo),
            adapter.usageCost({ days: 30 }).catch(() => null),
            adapter.sessionsUsage({ limit: 100 }).catch(() => null),
          ]);

          const rootConfig = configSnap.config as Record<string, unknown> | undefined;
          const providers = getProvidersFromConfig(rootConfig);
          const authProfiles = getAuthProfilesFromConfig(rootConfig);

          const providerCosts = ((sessionsUsageInfo?.aggregates as { byProvider?: ProviderCostRow[] } | undefined)?.byProvider) ?? [];
          const modelCosts = ((sessionsUsageInfo?.aggregates as { byModel?: ModelCostRow[] } | undefined)?.byModel) ?? [];

          const authAccounts = Object.entries(authProfiles).map(([profileKey, profile]) =>
            normalizeAuthAccount(profileKey, profile, usageInfo, providerCosts, modelCosts),
          );
          const providerAccounts = Object.entries(providers).map(([providerId, provider]) =>
            normalizeProviderAccount(providerId, provider, usageInfo, providerCosts, modelCosts),
          );

          const accounts = [...authAccounts, ...providerAccounts];

          const latestDay = (costInfo?.latestDay ?? null) as { cost?: number; totalTokens?: number } | null;
          const costSummary = costInfo ? {
            totalCost: typeof costInfo.totalCost === "number" ? costInfo.totalCost : undefined,
            totalTokens: typeof costInfo.totalTokens === "number" ? costInfo.totalTokens : undefined,
            latestDayCost: typeof latestDay?.cost === "number" ? latestDay.cost : undefined,
            latestDayTokens: typeof latestDay?.totalTokens === "number" ? latestDay.totalTokens : undefined,
          } : null;

          set({
            accounts,
            groups: buildGroups(accounts),
            costSummary,
            isLoading: false,
            lastUpdated: Date.now(),
          });
        } catch (err) {
          console.error("Failed to fetch AI accounts:", err);
          set({
            error: err instanceof Error ? err.message : "Failed to fetch AI accounts",
            isLoading: false,
          });
        }
      },

      refresh: async () => {
        await get().fetchAccounts();
      },
    }),
    { name: "ai-accounts-store" },
  ),
);

export const __test__ = {
  resolveAccountStatus,
  normalizeAuthAccount,
  normalizeProviderAccount,
};
