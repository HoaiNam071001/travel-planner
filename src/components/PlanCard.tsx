import { Link } from "react-router-dom";
import { Popconfirm } from "antd";
import {
  ArrowRight,
  CalendarClock,
  Pencil,
  Route as RouteIcon,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslation } from "../i18n/useAppTranslation";
import Badge from "../shared/components/Badge";
import Card from "../shared/components/Card";
import IconButton from "../shared/components/IconButton";
import { planPath } from "../shared/constants/routes";
import { dayCount, formatDateRange, formatPrice } from "../shared/utils/format";
import type { Id, Plan } from "../shared/types/models";

export interface PlanCardProps {
  plan: Plan;
  unitCount: number;
  itemCount: number;
  totalCost: number;
  isShared?: boolean;
  onEdit: (plan: Plan) => void;
  onDelete: (id: Id) => void;
}

export default function PlanCard({
  plan,
  unitCount,
  itemCount,
  totalCost,
  isShared = false,
  onEdit,
  onDelete,
}: PlanCardProps) {
  const { t } = useTranslation("plans");
  const range = formatDateRange(plan.start_date, plan.end_date);
  const days = dayCount(plan.start_date, plan.end_date);

  return (
    <Link to={planPath(plan.id)} className="group block">
      <Card className="relative h-full overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-surface-elevated/82 hover:shadow-[0_32px_72px_-44px_rgba(37,99,235,0.28)]">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.1),transparent_28%),linear-gradient(180deg,transparent,rgba(59,130,246,0.04))] opacity-90"
        />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {isShared && (
                  <Badge tone="violet" size="sm" icon={Users}>
                    {t("card.shared")}
                  </Badge>
                )}
                {range && (
                  <Badge size="sm" numeric icon={CalendarClock}>
                    {days > 0 ? t("card.days", { count: days }) : range}
                  </Badge>
                )}
              </div>
              <h3 className="mt-3 text-lg font-bold leading-snug text-text-primary">{plan.name}</h3>
            </div>

            <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <IconButton
                size="sm"
                tone="brand"
                icon={Pencil}
                onClick={(event) => {
                  event.preventDefault();
                  onEdit(plan);
                }}
                aria-label={t("card.edit")}
                className="bg-surface-elevated/52"
              />
              {!isShared && (
                <Popconfirm
                  title={t("card.deleteTitle")}
                  description={t("card.deleteDescription")}
                  okText={t("common:actions.delete")}
                  cancelText={t("common:actions.cancel")}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(plan.id)}
                >
                  <IconButton
                    size="sm"
                    tone="danger"
                    icon={Trash2}
                    onClick={(event) => event.preventDefault()}
                    aria-label={t("card.delete")}
                    className="bg-surface-elevated/52"
                  />
                </Popconfirm>
              )}
            </div>
          </div>

          {plan.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{plan.description}</p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[22px] bg-surface-elevated/52 p-3 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                <RouteIcon className="h-3.5 w-3.5 text-primary" />
                {t("card.units")}
              </p>
              <p className="mt-2 text-xl font-bold text-text-primary tnum">{unitCount}</p>
            </div>
            <div className="rounded-[22px] bg-surface-elevated/52 p-3 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("card.items")}
              </p>
              <p className="mt-2 text-xl font-bold text-text-primary tnum">{itemCount}</p>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between border-t border-border/8 pt-4">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                {t("card.cost")}
              </p>
              <p className="mt-2 font-display text-xl font-bold text-text-primary tnum">
                {totalCost > 0 ? formatPrice(totalCost) : "-"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary transition group-hover:translate-x-0.5">
              {t("card.open")}
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
