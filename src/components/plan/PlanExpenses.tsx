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
  const colorIndexById = useMemo(() => expenseColorIndex(expenses), [expenses]);
  const total = useMemo(() => expenses.reduce((sum, expense) => sum + (Number(expense.price) || 0), 0), [expenses]);
  const scheduledCount = expenses.filter((expense) => expense.start_time).length;

  return (
    <div className="animate-fade-up space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={Receipt} label="Số khoản" value={expenses.length} />
        <StatTile
          icon={CalendarClock}
          label="Đã lên lịch"
          value={scheduledCount}
          sub={`${expenses.length - scheduledCount} chưa xếp giờ`}
        />
        <StatTile icon={Wallet} label="Tổng chi phí khác" value={formatPrice(total)} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">
          Chi phí không gắn với một hoạt động cụ thể như vé xe, máy bay, khách sạn hoặc mua sắm.
        </p>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>
          Thêm chi phí
        </Button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Chưa có khoản chi phí khác nào"
          hint="Thêm vé xe, khách sạn, mua sắm hoặc các khoản phát sinh để tính đúng tổng chi phí của kế hoạch."
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>
              Thêm chi phí
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
  const range = itemRange(expense);
  const rangeLabel = range ? formatDateTimeRange(range.start, range.end) : null;

  return (
    <article className={`surface-soft border-l-4 p-4 ${color.accentBorder}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[14px] font-bold text-text-primary">{expense.name}</h3>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-0.5">
            {onEdit && <IconButton size="sm" tone="brand" icon={Pencil} onClick={onEdit} aria-label="Sửa chi phí" />}
            {onDelete && (
              <Popconfirm
                title="Xoá khoản chi phí này?"
                okText="Xoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={onDelete}
              >
                <IconButton size="sm" tone="danger" icon={Trash2} aria-label="Xoá chi phí" />
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
            Chưa xếp lịch
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
