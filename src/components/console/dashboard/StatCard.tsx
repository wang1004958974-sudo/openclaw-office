import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle?: string;
  progress?: number;
  color?: string;
  extra?: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  progress,
  color = "text-blue-500",
  extra,
  headerExtra,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</span>
        </div>
        {headerExtra}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      {progress != null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
      {extra}
    </div>
  );
}
