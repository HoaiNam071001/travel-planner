import { useMemo, type ReactNode } from "react";
import type { Dayjs } from "dayjs";
import {
  CalendarClock,
  Clock,
  Layers,
  MapPin,
  Pencil,
  Route as RouteIcon,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Badge from "../../shared/components/Badge";
import Button from "../../shared/components/Button";
import EmptyState from "../../shared/components/EmptyState";
import StatTile from "../../shared/components/StatTile";
import {
  dayCount,
  formatDateRange,
  formatDateTimeRange,
  formatDuration,
  formatPrice,
  formatPriceShort,
} from "../../shared/utils/format";
import { planTotals, unitStats } from "../../shared/utils/planStats";
import { computeItemSchedule, itemDurationMinutes, unitRange } from "../../shared/utils/schedule";
import type { Id, Item, ItemLocation, Plan, Unit } from "../../shared/types/models";
import { unitColor, type UnitColor } from "./timeline/colors";

export interface VisitedLocation extends ItemLocation {
  visits: number;
}

export interface PlanOverviewProps {
  plan: Plan | null;
  planUnits: Unit[];
  itemsByUnit: Map<Id, Item[]>;
  onStartBuilding: () => void;
  onEditUnit: (unit: Unit) => void;
}

export default function PlanOverview({
  plan,
  planUnits,
  itemsByUnit,
  onStartBuilding,
  onEditUnit,
}: PlanOverviewProps) {
  const totals = useMemo(() => planTotals(planUnits, itemsByUnit), [planUnits, itemsByUnit]);
  const days = dayCount(plan?.start_date, plan?.end_date);
  const range = formatDateRange(plan?.start_date, plan?.end_date);

  // Địa điểm ghé qua trong cả kế hoạch + số lần xuất hiện, sắp theo số lần giảm dần.
  const visitedLocations = useMemo<VisitedLocation[]>(() => {
    const byId = new Map<Id, VisitedLocation>();
    for (const unit of planUnits) {
      for (const item of itemsByUnit.get(unit.id) ?? []) {
        for (const loc of item.locations ?? []) {
          const entry = byId.get(loc.id) ?? { ...loc, visits: 0 };
          entry.visits += 1;
          byId.set(loc.id, entry);
        }
      }
    }
    return [...byId.values()].sort((a, b) => b.visits - a.visits);
  }, [planUnits, itemsByUnit]);

  return (
    <div className="animate-fade-up space-y-6">
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-5 sm:px-8 sm:py-6">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-brand-800/60 via-slate-950 to-slate-950"
        />
        <div aria-hidden className="hero-grid absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl"
        />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Sparkles className="h-3.5 w-3.5 text-brand-300" />
                </span>
                <h1 className="max-w-2xl truncate font-display text-2xl font-extrabold leading-tight text-white sm:text-[30px]">
                  {plan?.name}
                </h1>
              </div>
              {plan?.description && (
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/55">{plan.description}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {range && (
                <Badge tone="inverse" icon={CalendarClock} numeric>
                  {range}
                </Badge>
              )}
              {days > 0 && <Badge tone="inverse">{days} ngày</Badge>}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              inverse
              icon={RouteIcon}
              label="Chặng"
              value={totals.unitCount}
              sub={days > 0 ? `trong ${days} ngày` : undefined}
            />
            <StatTile
              inverse
              icon={Sparkles}
              label="Hoạt động"
              value={totals.itemCount}
              sub={`${totals.locationCount} địa điểm`}
            />
            <StatTile
              inverse
              icon={Wallet}
              label="Tổng chi phí"
              value={formatPriceShort(totals.cost)}
              sub={totals.cost > 0 ? formatPrice(totals.cost) : "chưa có chi phí"}
            />
            <StatTile
              inverse
              icon={Clock}
              label="Tổng thời lượng"
              value={formatDuration(totals.minutes) ?? "—"}
              sub={totals.minutes > 0 ? "theo khung giờ hoạt động" : "chưa đặt khung giờ"}
            />
          </div>
        </div>
      </section>

      {planUnits.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title="Kế hoạch này chưa có chặng nào"
          hint="Sang tab Xây dựng để thêm chặng và kéo-thả hoạt động vào từng chặng."
          action={
            <Button variant="primary" onClick={onStartBuilding}>
              Bắt đầu xây dựng
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ------------------------------------------------- lịch trình */}
          <div className="space-y-4 lg:col-span-2">
            <SectionLabel icon={Layers}>Lịch trình</SectionLabel>

            {planUnits.map((unit, index) => (
              <UnitTimelineCard
                key={unit.id}
                unit={unit}
                index={index}
                color={unitColor(index)}
                items={itemsByUnit.get(unit.id) ?? []}
                onEdit={onEditUnit}
              />
            ))}
          </div>

          {/* ---------------------------------------------------- sidebar */}
          <div className="space-y-6">
            <CostBreakdown planUnits={planUnits} itemsByUnit={itemsByUnit} total={totals.cost} />
            <VisitedLocations locations={visitedLocations} />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  children,
  action,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </h2>
      {action}
    </div>
  );
}

export interface UnitTimelineCardProps {
  unit: Unit;
  index: number;
  color: UnitColor;
  items: Item[];
  /** Không truyền = ẩn nút "Sửa" (dùng cho trang preview công khai, chỉ-xem). */
  onEdit?: (unit: Unit) => void;
}

export function UnitTimelineCard({ unit, index, color, items, onEdit }: UnitTimelineCardProps) {
  const stats = unitStats(items, unit.break_minutes);
  const range = unitRange(unit);
  const rangeLabel = range ? formatDateTimeRange(range.start, range.end) : null;
  const schedule = computeItemSchedule(unit, items, unit.break_minutes);

  return (
    <article className="surface overflow-hidden">
      <header className="flex items-start gap-3.5 border-b border-slate-100 px-5 py-4">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display text-[13px] font-bold text-white tnum ${color.solidChip}`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-bold">{unit.name}</h3>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(unit)}
                className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                Sửa
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {unit.unit_type && (
              <Badge tone="brand" size="sm">
                {unit.unit_type.name}
              </Badge>
            )}
            {rangeLabel ? (
              <Badge size="sm" icon={CalendarClock} numeric>
                {rangeLabel}
              </Badge>
            ) : (
              <Badge size="sm" icon={CalendarClock}>
                Chưa xếp lịch
              </Badge>
            )}
            <Badge size="sm" icon={Sparkles} tone="violet" numeric>
              {stats.itemCount} hoạt động
            </Badge>
            {stats.minutes > 0 && (
              <Badge size="sm" icon={Clock} numeric>
                {formatDuration(stats.minutes)}
              </Badge>
            )}
            {stats.cost > 0 && (
              <Badge size="sm" tone="emerald" icon={Wallet} numeric>
                {formatPrice(stats.cost)}
              </Badge>
            )}
          </div>

          {unit.description && (
            <p className="mt-2.5 text-sm leading-relaxed text-slate-500">{unit.description}</p>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-slate-400">
          Chặng này chưa có hoạt động nào.
        </p>
      ) : schedule.length === 0 ? (
        <ol className="divide-y divide-slate-100">
          {items.map((item) => (
            <ItemTimelineRow key={item.id} item={item} color={color} start={null} end={null} inferred />
          ))}
        </ol>
      ) : (
        <ol className="divide-y divide-slate-100">
          {schedule.map(({ item, start, end, inferred }, index) => (
            <div key={item.id}>
              <ItemTimelineRow item={item} color={color} start={start} end={end} inferred={inferred} />
              {index < schedule.length - 1 && unit.break_minutes > 0 && (
                <BreakTimelineRow breakMinutes={unit.break_minutes} start={end} />
              )}
            </div>
          ))}
        </ol>
      )}
    </article>
  );
}

export interface ItemTimelineRowProps {
  item: Item;
  color: UnitColor;
  start: Dayjs | null;
  end: Dayjs | null;
  inferred: boolean;
}

export function ItemTimelineRow({ item, color, start, end, inferred }: ItemTimelineRowProps) {
  const duration = formatDuration(itemDurationMinutes(item));
  const thumb = item.locations?.find((l) => l.images?.length)?.images?.[0];

  return (
    <li className="flex gap-4 px-5 py-3.5 transition hover:bg-slate-50/70">
      {/* Cột giờ + đường nối dọc tạo cảm giác timeline. */}
      <div className="flex w-[68px] shrink-0 flex-col items-end pt-0.5">
        {start && end ? (
          <>
            <span
              className={`font-mono text-[13px] font-medium tnum ${
                inferred ? "text-slate-400" : "text-slate-700"
              }`}
            >
              {start.format("HH:mm")}
            </span>
            <span className="font-mono text-[11px] text-slate-400 tnum">{end.format("HH:mm")}</span>
          </>
        ) : (
          <span className="text-[11px] text-slate-300">--:--</span>
        )}
      </div>

      <div className="relative flex flex-col items-center pt-1.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ring-4 ring-slate-50 ${
            inferred ? "bg-slate-300" : color.dot
          }`}
        />
        <span className="mt-1 w-px flex-1 bg-slate-200" />
      </div>

      <div className={`min-w-0 flex-1 border-l-2 pl-3 ${inferred ? "border-slate-100" : color.accentBorder}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
          {item.price != null && Number(item.price) > 0 && (
            <span className="shrink-0 text-sm font-semibold text-slate-700 tnum">
              {formatPrice(item.price)}
            </span>
          )}
        </div>

        {item.locations?.length > 0 && (
          <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{item.locations.map((l) => l.name).join(" → ")}</span>
          </p>
        )}

        {item.note && <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{item.note}</p>}

        {duration && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-400 tnum">
            <Clock className="h-3 w-3" />
            {duration}
          </span>
        )}
      </div>

      {thumb && (
        <img
          src={thumb}
          alt=""
          className="hidden h-14 w-20 shrink-0 rounded-xl border border-slate-200 object-cover sm:block"
        />
      )}
    </li>
  );
}

function BreakTimelineRow({ breakMinutes, start }: { breakMinutes: number; start: Dayjs }) {
  const breakEnd = start.add(breakMinutes, "minute");

  return (
    <li className="flex gap-4 px-5 py-2 transition hover:bg-slate-50/70">
      <div className="flex w-[68px] shrink-0 flex-col items-end pt-0.5">
        <span className="font-mono text-[11px] italic text-slate-400 tnum">
          {start.format("HH:mm")}
        </span>
        <span className="font-mono text-[11px] italic text-slate-400 tnum">
          {breakEnd.format("HH:mm")}
        </span>
      </div>

      <div className="relative flex flex-col items-center pt-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
        <span className="mt-1 w-px flex-1 bg-slate-200" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] italic text-slate-400">Nghỉ {breakMinutes} phút</p>
      </div>
    </li>
  );
}

export interface CostBreakdownProps {
  planUnits: Unit[];
  itemsByUnit: Map<Id, Item[]>;
  total: number;
}

export function CostBreakdown({ planUnits, itemsByUnit, total }: CostBreakdownProps) {
  const rows = planUnits
    .map((unit) => ({ unit, cost: unitStats(itemsByUnit.get(unit.id) ?? []).cost }))
    .filter((row) => row.cost > 0)
    .sort((a, b) => b.cost - a.cost);

  return (
    <section className="surface p-5">
      <SectionLabel icon={Wallet}>Phân bổ chi phí</SectionLabel>

      {rows.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">
          Chưa có hoạt động nào ghi chi phí. Thêm giá cho hoạt động để thấy phân bổ ở đây.
        </p>
      ) : (
        <>
          <p className="mt-3 font-display text-2xl font-bold text-slate-900 tnum">
            {formatPrice(total)}
          </p>
          <ul className="mt-4 space-y-3">
            {rows.map(({ unit, cost }) => {
              const percent = total > 0 ? Math.round((cost / total) * 100) : 0;
              return (
                <li key={unit.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-medium text-slate-600">{unit.name}</span>
                    <span className="shrink-0 text-xs text-slate-500 tnum">
                      {formatPrice(cost)}
                      <span className="ml-1.5 text-slate-400">{percent}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                      style={{ width: `${Math.max(percent, 2)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export function VisitedLocations({ locations }: { locations: VisitedLocation[] }) {
  return (
    <section className="surface p-5">
      <SectionLabel icon={MapPin}>Địa điểm ghé qua</SectionLabel>

      {locations.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">
          Các hoạt động trong kế hoạch chưa gắn địa điểm nào.
        </p>
      ) : (
        <ul className="mt-3.5 space-y-2.5">
          {locations.map((loc) => (
            <li key={loc.id} className="flex items-center gap-3">
              {loc.images?.[0] ? (
                <img
                  src={loc.images[0]}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <MapPin className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{loc.name}</span>
              {loc.visits > 1 && (
                <Badge size="sm" numeric>
                  {loc.visits} lần
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
