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
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgb(var(--color-primary)/0.06),transparent_32%),radial-gradient(circle_at_top_right,rgb(var(--color-info)/0.05),transparent_26%)]"
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5">
            {Icon && (
              <div className="gradient-brand-soft flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-primary shadow-xs">
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
