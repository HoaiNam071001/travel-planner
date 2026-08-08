import { useMemo } from "react";
import { Popconfirm } from "antd";
import {
  CalendarClock,
  Link as LinkIcon,
  MapPin,
  Pencil,
  Plus,
  Receipt,
  StickyNote,
  Trash2,
  Wallet,
} from "lucide-react";
import { useTranslation } from "../../i18n/useAppTranslation";
import Badge from "../../shared/components/Badge";
import Button from "../../shared/components/Button";
import EmptyState from "../../shared/components/EmptyState";
import IconButton from "../../shared/components/IconButton";
import StatTile from "../../shared/components/StatTile";
import { formatDateTimeRange, formatPrice } from "../../shared/utils/format";
import { expenseColor, expenseColorIndex } from "../../shared/utils/planStats";
import { itemRange } from "../../shared/utils/schedule";
import type { Id, PlanExpense } from "../../shared/types/models";
import type { UnitColor } from "./timeline/colors";

export interface PlanExpensesProps {
  expenses: PlanExpense[];
  onCreate: () => void;
  onEdit: (expense: PlanExpense) => void;
  onDelete: (id: Id) => void;
}

export default function PlanExpenses({ expenses, onCreate, onEdit, onDelete }: PlanExpensesProps) {
  const { t } = useTranslation("planDetail");
  const colorIndexById = useMemo(() => expenseColorIndex(expenses), [expenses]);
  const total = useMemo(() => expenses.reduce((sum, expense) => sum + (Number(expense.price) || 0), 0), [expenses]);
  const scheduledCount = expenses.filter((expense) => expense.start_time).length;

  return (
    <div className="animate-fade-up space-y-5">
      <section className="surface-highlight relative overflow-hidden rounded-3xl px-6 py-5 sm:px-8 sm:py-6">
        <div aria-hidden className="hero-grid absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                </span>
                <h1 className="font-display text-xl font-extrabold leading-tight text-text-primary sm:text-2xl">
                  {t("planDetail:expenses.title")}
                </h1>
              </div>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-secondary">
                {t("planDetail:expenses.description")}
              </p>
            </div>

            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>
              {t("planDetail:expenses.add")}
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile icon={Receipt} label={t("planDetail:expenses.countLabel")} value={expenses.length} />
            <StatTile
              icon={CalendarClock}
              label={t("planDetail:expenses.scheduledLabel")}
              value={scheduledCount}
              sub={t("planDetail:expenses.scheduledSub", { count: expenses.length - scheduledCount })}
            />
            <StatTile icon={Wallet} label={t("planDetail:expenses.totalLabel")} value={formatPrice(total)} />
          </div>
        </div>
      </section>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("planDetail:expenses.emptyTitle")}
          hint={t("planDetail:expenses.emptyHint")}
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>
              {t("planDetail:expenses.add")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              color={expenseColor(colorIndexById.get(expense.id) ?? 0)}
              onEdit={() => onEdit(expense)}
              onDelete={() => onDelete(expense.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface ExpenseCardProps {
  expense: PlanExpense;
  color: UnitColor;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ExpenseCard({ expense, color, onEdit, onDelete }: ExpenseCardProps) {
  const { t } = useTranslation(["planDetail", "common"]);
  const range = itemRange(expense);
  const rangeLabel = range ? formatDateTimeRange(range.start, range.end) : null;

  return (
    <article className={`surface-soft border-l-4 p-4 ${color.accentBorder}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[14px] font-bold text-text-primary">{expense.name}</h3>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-0.5">
            {onEdit && (
              <IconButton
                size="sm"
                tone="brand"
                icon={Pencil}
                onClick={onEdit}
                aria-label={t("planDetail:expenses.edit")}
              />
            )}
            {onDelete && (
              <Popconfirm
                title={t("planDetail:expenses.deleteTitle")}
                okText={t("common:actions.delete")}
                cancelText={t("common:actions.cancel")}
                okButtonProps={{ danger: true }}
                onConfirm={onDelete}
              >
                <IconButton size="sm" tone="danger" icon={Trash2} aria-label={t("planDetail:expenses.delete")} />
              </Popconfirm>
            )}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {rangeLabel ? (
          <Badge size="sm" icon={CalendarClock} numeric>
            {rangeLabel}
          </Badge>
        ) : (
          <Badge size="sm" icon={CalendarClock}>
            {t("planDetail:overview.notScheduled")}
          </Badge>
        )}
        {expense.price != null && Number(expense.price) > 0 && (
          <Badge size="sm" tone="emerald" icon={Wallet} numeric>
            {formatPrice(expense.price)}
          </Badge>
        )}
      </div>

      {expense.location && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <span className="truncate">{expense.location.name}</span>
        </p>
      )}

      {expense.note && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-text-muted">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{expense.note}</span>
        </p>
      )}

      {expense.link && (
        <a
          href={expense.link}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <LinkIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{expense.link}</span>
        </a>
      )}
    </article>
  );
}
