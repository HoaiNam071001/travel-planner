import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarClock, Clock, Layers, Link as LinkIcon, Route as RouteIcon, Sparkles, Wallet } from "lucide-react";
import { fetchSharedPlan, type SharedPlanPayload } from "../services/sharedPlan.service";
import { dayCount, formatDateRange, formatDuration, formatPrice, formatPriceShort } from "../shared/utils/format";
import { groupItemsByUnit, planTotals } from "../shared/utils/planStats";
import { unitColor } from "../components/plan/timeline/colors";
import {
  CostBreakdown,
  UnitTimelineCard,
  VisitedLocations,
  type VisitedLocation,
} from "../components/plan/PlanOverview";
import Badge from "../shared/components/Badge";
import EmptyState from "../shared/components/EmptyState";
import StatTile from "../shared/components/StatTile";
import type { Id } from "../shared/types/models";

// Trang xem trước công khai (`/p/:token`) — KHÔNG bọc trong ProtectedRoute/AppLayout,
// ai có link cũng xem được, chỉ đọc, không có bất kỳ nút sửa/xoá nào. Dữ liệu tới từ
// RPC `get_shared_plan` (xem sharedPlan.service.ts) chứ không phải các service thường.
export default function SharedPlanPage() {
  const { token } = useParams<{ token: string }>();
  const [payload, setPayload] = useState<SharedPlanPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void fetchSharedPlan(token).then(({ data, error: fetchError }) => {
      if (fetchError) setError(fetchError.message);
      setPayload(data);
      setLoading(false);
    });
  }, [token]);

  const itemsByUnit = useMemo(() => groupItemsByUnit(payload?.items ?? []), [payload]);
  const totals = useMemo(() => {
    const base = planTotals(payload?.units ?? [], itemsByUnit);
    return { ...base, cost: base.cost + (payload?.expensesTotal ?? 0) };
  }, [payload, itemsByUnit]);
  const visitedLocations = useMemo<VisitedLocation[]>(() => {
    const byId = new Map<Id, VisitedLocation>();
    for (const unit of payload?.units ?? []) {
      for (const item of itemsByUnit.get(unit.id) ?? []) {
        for (const loc of item.locations ?? []) {
          const entry = byId.get(loc.id) ?? { ...loc, visits: 0 };
          entry.visits += 1;
          byId.set(loc.id, entry);
        }
      }
    }
    return [...byId.values()].sort((a, b) => b.visits - a.visits);
  }, [payload, itemsByUnit]);

  const days = dayCount(payload?.plan.start_date, payload?.plan.end_date);
  const range = formatDateRange(payload?.plan.start_date, payload?.plan.end_date);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-2 text-sm font-medium text-slate-500">
          <LinkIcon className="h-4 w-4" />
          Xem trước kế hoạch (chỉ đọc)
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-44 rounded-3xl bg-slate-200/60" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-200/50" />
              ))}
            </div>
          </div>
        ) : !payload ? (
          <EmptyState
            icon={LinkIcon}
            title="Liên kết không tồn tại hoặc đã bị tắt chia sẻ"
            hint={error || "Hỏi lại người đã gửi link này, hoặc liên kết có thể đã bị thu hồi."}
          />
        ) : (
          <div className="animate-fade-up space-y-6">
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
                        {payload.plan.name}
                      </h1>
                    </div>
                    {payload.plan.description && (
                      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/55">
                        {payload.plan.description}
                      </p>
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

            {payload.units.length === 0 ? (
              <EmptyState icon={RouteIcon} title="Kế hoạch này chưa có chặng nào" />
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
                    <Layers className="h-4 w-4" />
                    Lịch trình
                  </h2>

                  {payload.units.map((unit, index) => (
                    <UnitTimelineCard
                      key={unit.id}
                      unit={unit}
                      index={index}
                      color={unitColor(index)}
                      items={itemsByUnit.get(unit.id) ?? []}
                    />
                  ))}
                </div>

                <div className="space-y-6">
                  <CostBreakdown
                    planUnits={payload.units}
                    itemsByUnit={itemsByUnit}
                    expensesCost={payload.expensesTotal}
                    total={totals.cost}
                  />
                  <VisitedLocations locations={visitedLocations} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
