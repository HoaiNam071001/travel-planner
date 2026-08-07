import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Card from "./Card";

export interface PageHeaderProps {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <Card className="relative mb-6 overflow-hidden p-6 sm:p-7" elevated>
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(79,70,229,0.1),transparent_26%),linear-gradient(180deg,rgba(59,130,246,0.035),transparent)]"
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5">
            {Icon && (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(79,70,229,0.34),rgba(37,99,235,0.28),rgba(34,211,238,0.22))] text-white shadow-[0_18px_42px_-30px_rgba(37,99,235,0.48)]">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-tight text-text-primary">{title}</h1>
              {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-7 text-text-secondary">{subtitle}</p>}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {children && <div className="mt-6">{children}</div>}
      </div>
    </Card>
  );
}
