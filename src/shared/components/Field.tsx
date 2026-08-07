import type { ReactNode } from "react";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export default function Field({ label, hint, className = "", children }: FieldProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {label}
        </label>
        {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
