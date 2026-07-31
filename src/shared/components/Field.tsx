import type { ReactNode } from "react";

// Label + control cho form modal — thay cho <label className="mb-1 block ...">
// lặp lại ở mọi modal.
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
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
