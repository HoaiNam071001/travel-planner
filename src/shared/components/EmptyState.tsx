import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 text-center ${
        compact ? "px-4 py-10" : "px-6 py-16"
      }`}
    >
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-secondary text-text-muted">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
