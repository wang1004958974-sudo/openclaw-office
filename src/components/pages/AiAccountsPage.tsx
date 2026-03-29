import { AlertTriangle, CheckCircle2, Clock, RefreshCw, ServerCrash, Wallet } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertBanner } from "@/components/console/dashboard/AlertBanner";
import { ErrorState } from "@/components/console/shared/ErrorState";
import { LoadingState } from "@/components/console/shared/LoadingState";
import type { AiAccountUsageInfo, UsageLimitWindow } from "@/gateway/adapter-types";
import { useAiAccountsStore, type AiAccountGroup } from "@/store/console-stores/ai-accounts-store";
import { useOfficeStore } from "@/store/office-store";

export function AiAccountsPage() {
  const { t } = useTranslation("console");
  const { accounts, groups, costSummary, isLoading, error, refresh } = useAiAccountsStore();
  const wsStatus = useOfficeStore((s) => s.connectionStatus);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (isLoading && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("aiAccounts.title")} description={t("aiAccounts.description")} onRefresh={refresh} />
        <LoadingState message={t("aiAccounts.loading")} />
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("aiAccounts.title")} description={t("aiAccounts.description")} onRefresh={refresh} />
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  const totalAccounts = accounts.length;
  const errorAccounts = accounts.filter((a) => a.status === "error").length;
  const warningAccounts = accounts.filter((a) => a.status === "warning").length;
  const okAccounts = accounts.filter((a) => a.status === "ok").length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("aiAccounts.title")} description={t("aiAccounts.description")} onRefresh={refresh} loading={isLoading} />
      {wsStatus !== "connected" && <AlertBanner variant="warning" message={t("dashboard.alerts.gatewayDisconnected")} />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <StatCard title={t("aiAccounts.stats.total")} value={String(totalAccounts)} icon={Wallet} color="text-blue-500" />
        <StatCard title={t("aiAccounts.stats.ok")} value={String(okAccounts)} icon={CheckCircle2} color="text-green-500" />
        <StatCard title={t("aiAccounts.stats.warning")} value={String(warningAccounts)} icon={AlertTriangle} color="text-amber-500" />
        <StatCard title={t("aiAccounts.stats.error")} value={String(errorAccounts)} icon={ServerCrash} color="text-red-500" />
        <StatCard title={t("aiAccounts.stats.cost30d")} value={formatMoney(costSummary?.totalCost)} icon={Wallet} color="text-emerald-500" />
        <StatCard title={t("aiAccounts.stats.costToday")} value={formatMoney(costSummary?.latestDayCost)} icon={Wallet} color="text-teal-500" />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("aiAccounts.sections.grouped")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("aiAccounts.sections.groupedDesc")}</p>
        </div>
        {groups.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">{t("aiAccounts.empty")}</div>
        ) : (
          <div className="space-y-5">{groups.map((group) => <LinkedGroupCard key={group.key} group={group} />)}</div>
        )}
      </section>
    </div>
  );
}

function LinkedGroupCard({ group }: { group: AiAccountGroup }) {
  const { t } = useTranslation("console");
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{group.providerDisplayName}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("aiAccounts.sections.linkedSummary", { auth: group.authAccounts.length, providers: group.providerAccounts.length })}</p>
        </div>
        <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">{group.providerKey}</code>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SubSection title={t("aiAccounts.sections.auth")} description={t("aiAccounts.sections.authDesc")} emptyText={t("aiAccounts.sections.authEmpty")}>
          {group.authAccounts.map((account) => <AccountCard key={account.accountId} account={account} compact />)}
        </SubSection>

        <SubSection title={t("aiAccounts.sections.providers")} description={t("aiAccounts.sections.providersDesc")} emptyText={t("aiAccounts.sections.providersEmpty")}>
          {group.providerAccounts.map((account) => <AccountCard key={account.accountId} account={account} compact />)}
        </SubSection>
      </div>
    </div>
  );
}

function SubSection({ title, description, emptyText, children }: { title: string; description: string; emptyText: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/30">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {hasChildren ? <div className="space-y-3">{children}</div> : <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">{emptyText}</div>}
    </div>
  );
}

function AccountCard({ account, compact }: { account: AiAccountUsageInfo; compact?: boolean }) {
  const { t } = useTranslation("console");
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${compact ? "" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 max-w-full truncate text-base font-semibold text-gray-900 dark:text-gray-100" title={account.accountLabel}>{account.accountLabel}</h3>
            <StatusBadge status={account.status ?? "unknown"} />
            <SourceBadge source={account.source} />
            <QuotaModeBadge mode={account.quotaMode} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 break-all text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{account.providerDisplayName}</span>
            {account.authType ? <><span>•</span><span>{account.authType}</span></> : null}
            {account.email ? <><span>•</span><span>{account.email}</span></> : null}
            {account.baseUrl ? <><span>•</span><code className="max-w-full truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800" title={account.baseUrl}>{account.baseUrl}</code></> : null}
            {account.api ? <><span>•</span><span>{account.api}</span></> : null}
            {typeof account.modelCount === "number" ? <><span>•</span><span>{t("aiAccounts.labels.models", { count: account.modelCount })}</span></> : null}
          </p>
          {account.identityHint ? <p className="mt-2 truncate text-xs text-gray-400" title={account.identityHint}>{account.identityHint}</p> : null}
          {(account.estimatedCost !== undefined || account.estimatedTokens !== undefined) ? (
            <p className={`mt-2 text-xs ${account.costState === "pricing-mismatch" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {account.costState === "pricing-mismatch"
                ? t("aiAccounts.labels.pricingMismatch", { tokens: formatCompactTokens(account.estimatedTokens), missing: account.missingCostEntries ?? 0 })
                : t("aiAccounts.labels.estimatedCost", { cost: account.estimatedCost?.toFixed(2) ?? "-", tokens: formatCompactTokens(account.estimatedTokens) })}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right text-xs text-gray-400">
          {account.lastCheckedAt ? (
            <div className="flex items-center justify-end gap-1 whitespace-nowrap rounded bg-gray-50 px-2 py-1 dark:bg-gray-800/60">
              <Clock className="h-3 w-3" />
              <span>{formatLastCheckedAt(account.lastCheckedAt)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {account.windows.map((window) => <WindowCard key={window.key} window={window} />)}
      </div>

      {account.topModels && account.topModels.length > 0 ? (
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
          <div className="mb-1 font-medium">{t("aiAccounts.labels.topModels")}</div>
          <div className="space-y-1">
            {account.topModels.map((item) => (
              <div key={item.model} className="flex items-center justify-between gap-3">
                <span className="truncate">{item.model}</span>
                <span className="shrink-0 text-gray-500 dark:text-gray-400">{typeof item.cost === "number" && item.cost > 0 ? `$${item.cost.toFixed(2)}` : item.missingCostEntries ? `missing:${item.missingCostEntries}` : "-"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {account.error === "unavailable" ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          {account.quotaMode === "local" ? t("aiAccounts.localOnly") : t("aiAccounts.unavailable")}
        </div>
      ) : null}
    </div>
  );
}

function WindowCard({ window }: { window: UsageLimitWindow }) {
  const { t } = useTranslation("console");
  const hasUsageSignal = window.used !== undefined || window.limit !== undefined || window.usedPercent !== undefined || window.resetAt !== undefined;
  const unavailable = window.source === "unavailable" || !hasUsageSignal;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{window.label}</span>
        {window.source === "derived" ? <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-blue-500 dark:bg-blue-900/30">derived</span> : null}
      </div>
      {unavailable ? (
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("aiAccounts.notIntegrated")}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">unavailable</div>
        </div>
      ) : (
        <div className="space-y-2">
          {window.used !== undefined ? (
            <div className="flex items-end gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatUsage(window.used, window.unit)}</span>
              {window.limit !== undefined ? <span className="mb-0.5 text-sm text-gray-500">/ {formatUsage(window.limit, window.unit)}</span> : null}
            </div>
          ) : (
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {window.usedPercent !== undefined ? `${Math.max(0, 100 - window.usedPercent).toFixed(0)}% left` : t("aiAccounts.available")}
            </div>
          )}
          {window.usedPercent !== undefined ? (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, window.usedPercent))}%` }} />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{window.usedPercent.toFixed(0)}% used</div>
            </div>
          ) : null}
          {window.resetAt !== undefined ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">{formatResetTime(window.resetAt)}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function formatMoney(val?: number) {
  if (typeof val !== "number" || !Number.isFinite(val)) return "-";
  return `$${val.toFixed(2)}`;
}

function formatCompactTokens(val?: number) {
  if (typeof val !== "number" || !Number.isFinite(val)) return "-";
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  return `${val}`;
}

function formatUsage(val: number, unit?: string) {
  if (unit === "usd") return `$${val.toFixed(2)}`;
  if (unit === "tokens") {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
    return `${val}`;
  }
  if (unit === "requests") return `${val} reqs`;
  if (unit === "credits") return `${val.toFixed(2)} cr`;
  return val.toString();
}

function formatLastCheckedAt(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs)) return new Date(timestamp).toLocaleString();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatResetTime(resetAt: number) {
  const diffMs = resetAt - Date.now();
  if (!Number.isFinite(diffMs)) return `resets ${new Date(resetAt).toLocaleString()}`;
  if (diffMs <= 0) return `reset reached`;

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

  const relative = parts.length > 0 ? parts.join(" ") : "<1m";
  return `resets in ${relative}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ok") return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">Normal</span>;
  if (status === "warning") return <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Warning</span>;
  if (status === "error") return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">Error</span>;
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400">Unknown</span>;
}

function SourceBadge({ source }: { source?: string }) {
  if (source === "auth") return <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">auth</span>;
  if (source === "provider") return <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">provider</span>;
  return null;
}

function QuotaModeBadge({ mode }: { mode?: string }) {
  if (mode === "official") return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">official quota</span>;
  if (mode === "local") return <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">local only</span>;
  if (mode === "manual") return <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">manual</span>;
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-300">unavailable</span>;
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: typeof Wallet; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className={`rounded-lg bg-gray-50 p-3 dark:bg-gray-800 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function PageHeader({ title, description, onRefresh, loading }: { title: string; description: string; onRefresh: () => void | Promise<void>; loading?: boolean }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button onClick={() => void onRefresh()} disabled={loading} className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {t("actions.refresh")}
      </button>
    </div>
  );
}
