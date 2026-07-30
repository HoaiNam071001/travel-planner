import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Badge from "../../shared/components/Badge";
import { formatPrice } from "../../shared/utils/format";

const HOUR_WIDTH = 32; // px, width per hour
const TIMELINE_PADDING = 60; // px, space for labels on left

// Calculate pixel position from timestamp within timeline range
function dateToPixel(date, planStart, planEnd, totalHours) {
  if (!date) return 0;
  const d = new Date(date);
  const start = new Date(planStart);
  const end = new Date(planEnd);
  const totalMs = end - start;
  const currentMs = d - start;
  const ratio = Math.max(0, Math.min(currentMs / totalMs, 1));
  return ratio * totalHours * HOUR_WIDTH;
}

// Calculate width in pixels for date range
function dateRangeToWidth(startDate, endDate, totalHours) {
  if (!startDate || !endDate) return 60;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const unitHours = (end - start) / (1000 * 60 * 60);
  return Math.max(60, (unitHours / totalHours) * (totalHours * HOUR_WIDTH));
}

// Pixel position back to timestamp
function pixelToDate(px, planStart, planEnd, totalHours) {
  const ratio = px / (totalHours * HOUR_WIDTH);
  const start = new Date(planStart);
  const end = new Date(planEnd);
  const duration = end - start;
  return new Date(start.getTime() + ratio * duration);
}

export default function PlanTimeline({
  plan,
  planUnits,
  itemsByUnit,
  onUpdateUnitDates,
  onUpdateItemStartTime,
  onEditUnit,
  onRemoveUnit,
  onDeleteUnit,
  onCreateItem,
  onEditItem,
  onDeleteItem,
}) {
  const [expandedUnitId, setExpandedUnitId] = useState(null);
  const [draggedUnitId, setDraggedUnitId] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  if (!plan || !plan.start_date || !plan.end_date) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center text-sm text-amber-800">
        Đặt khoảng thời gian cho kế hoạch để sử dụng lịch trình.
      </div>
    );
  }

  const totalHours = (new Date(plan.end_date) - new Date(plan.start_date)) / (1000 * 60 * 60);
  const timelineWidth = totalHours * HOUR_WIDTH;

  function handleUnitDragStart(e, unitId) {
    e.preventDefault();
    setDraggedUnitId(unitId);
    setDragOffset(e.clientX);
  }

  function handleMouseMove(e) {
    if (!draggedUnitId) return;
    const delta = e.clientX - dragOffset;
    const unit = planUnits.find((u) => u.id === draggedUnitId);
    if (!unit || !unit.start_date) return;

    const currentPos = dateToPixel(unit.start_date, plan.start_date, plan.end_date, totalHours);
    const newPos = Math.max(0, Math.min(currentPos + delta, timelineWidth));
    const newDate = pixelToDate(newPos, plan.start_date, totalHours);

    setDragOffset(e.clientX);
  }

  function handleMouseUp(e) {
    if (!draggedUnitId) return;
    const unit = planUnits.find((u) => u.id === draggedUnitId);
    if (!unit || !unit.start_date) return;

    const currentPos = dateToPixel(unit.start_date, plan.start_date, plan.end_date, totalHours);
    const delta = e.clientX - dragOffset;
    const newPos = Math.max(0, Math.min(currentPos + delta, timelineWidth));
    const newDate = pixelToDate(newPos, plan.start_date, plan.end_date, totalHours);

    // Update unit's start_date (and optionally end_date if it exists)
    const duration = unit.end_date ? new Date(unit.end_date) - new Date(unit.start_date) : 0;
    const newEndDate = duration > 0 ? new Date(newDate.getTime() + duration) : unit.end_date;

    onUpdateUnitDates(draggedUnitId, {
      start_date: newDate.toISOString(),
      end_date: newEndDate?.toISOString(),
    });

    setDraggedUnitId(null);
  }

  return (
    <div
      className="space-y-4 animate-fade-up"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setDraggedUnitId(null)}
    >
      {/* Timeline Header */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-0 pb-2" style={{ minWidth: timelineWidth + TIMELINE_PADDING + 60 }}>
          <div className="w-16 shrink-0" />
          <TimelineHeader
            startDate={plan.start_date}
            totalHours={totalHours}
          />
        </div>
      </div>

      {/* Units */}
      <div className="space-y-2 overflow-x-auto">
        {planUnits.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Chưa có chặng nào trong kế hoạch.
          </div>
        ) : (
          planUnits.map((unit) => (
            <TimelineUnit
              key={unit.id}
              unit={unit}
              plan={plan}
              items={itemsByUnit.get(unit.id) ?? []}
              isExpanded={expandedUnitId === unit.id}
              isDragging={draggedUnitId === unit.id}
              onToggleExpand={() =>
                setExpandedUnitId(expandedUnitId === unit.id ? null : unit.id)
              }
              onDragStart={(e) => handleUnitDragStart(e, unit.id)}
              onUpdateItemStartTime={onUpdateItemStartTime}
              onEditItem={onEditItem}
              totalHours={totalHours}
              timelineStart={plan.start_date}
              timelineEnd={plan.end_date}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TimelineHeader({ startDate, totalHours }) {
  const hours = [];
  const start = new Date(startDate);

  for (let i = 0; i <= totalHours; i += 6) {
    const h = new Date(start.getTime() + i * 60 * 60 * 1000);
    hours.push(h);
  }

  return (
    <div className="flex flex-1 border-b border-slate-200">
      {hours.map((hour, idx) => (
        <div
          key={idx}
          className="border-l border-slate-200 px-2 py-2 text-xs font-medium text-slate-500 text-center"
          style={{ width: `${6 * HOUR_WIDTH}px` }}
        >
          <div>{hour.toLocaleDateString("vi-VN", { month: "2-digit", day: "2-digit" })}</div>
          <div className="text-slate-400">{hour.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      ))}
    </div>
  );
}

function TimelineUnit({
  unit,
  plan,
  items,
  isExpanded,
  isDragging,
  onToggleExpand,
  onDragStart,
  onUpdateItemStartTime,
  onEditItem,
  totalHours,
  timelineStart,
  timelineEnd,
}) {
  const startPos = unit.start_date ? dateToPixel(unit.start_date, timelineStart, timelineEnd, totalHours) : 0;
  const width = unit.start_date && unit.end_date
    ? dateRangeToWidth(unit.start_date, unit.end_date, totalHours)
    : 100;

  const costSum = items.reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="p-1 text-slate-400 hover:text-slate-600 transition shrink-0"
          aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="w-16 shrink-0 text-xs font-semibold text-slate-700 truncate">
          {unit.name}
        </div>

        <div
          className="relative flex-1 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden"
          style={{ minWidth: `${totalHours * HOUR_WIDTH + 60}px` }}
        >
          <div
            className={`absolute top-0 h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl border border-brand-400 shadow-sm transition cursor-move hover:shadow-lg flex items-center px-3 gap-2 ${
              isDragging ? "opacity-50" : ""
            }`}
            style={{
              left: `${TIMELINE_PADDING + startPos}px`,
              width: `${width}px`,
            }}
            onMouseDown={onDragStart}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {unit.start_date && new Date(unit.start_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
              </p>
              <p className="text-xs text-brand-50 truncate">
                {items.length} hoạt động
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <Badge tone="violet" numeric>{items.length}</Badge>
          {costSum > 0 && <Badge tone="emerald" numeric>{formatPrice(costSum)}</Badge>}
        </div>
      </div>

      {isExpanded && (
        <ExpandedUnitView
          unit={unit}
          items={items}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          totalHours={totalHours}
          onUpdateItemStartTime={onUpdateItemStartTime}
          onEditItem={onEditItem}
        />
      )}
    </div>
  );
}

function ExpandedUnitView({ unit, items, timelineStart, timelineEnd, totalHours, onUpdateItemStartTime, onEditItem }) {
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  function handleItemDragStart(e, itemId) {
    e.preventDefault();
    e.stopPropagation();
    setDraggedItemId(itemId);
    setDragOffset(e.clientX);
  }

  function handleMouseMove(e) {
    if (!draggedItemId) return;
    // Can be enhanced to show live preview
  }

  function handleMouseUp(e) {
    if (!draggedItemId) return;
    const item = items.find((i) => i.id === draggedItemId);
    if (!item) return;

    const unitStartTime = new Date(unit.start_date || timelineStart);
    const unitEndTime = new Date(unit.end_date || timelineEnd);
    const unitDuration = unitEndTime - unitStartTime;

    const delta = e.clientX - dragOffset;
    const itemStartTime = item.start_time ? new Date(item.start_time) : unitStartTime;

    // Calculate new time based on drag delta
    const pixelsPerMs = (totalHours * HOUR_WIDTH) / unitDuration;
    const timeDelta = delta / pixelsPerMs;
    const newStartTime = new Date(itemStartTime.getTime() + timeDelta);

    // Constrain within unit bounds
    const constrainedTime = new Date(
      Math.max(unitStartTime.getTime(), Math.min(newStartTime.getTime(), unitEndTime.getTime()))
    );

    onUpdateItemStartTime(draggedItemId, constrainedTime.toISOString());

    setDraggedItemId(null);
  }

  return (
    <div
      className="mt-3 ml-7 pl-3 border-l-2 border-slate-200 space-y-1"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setDraggedItemId(null)}
    >
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">Chưa có hoạt động trong chặng này</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const itemStartTime = item.start_time ? new Date(item.start_time) : new Date(unit.start_date);
            const unitStart = new Date(unit.start_date || timelineStart);
            const unitEnd = new Date(unit.end_date || timelineEnd);
            const unitDuration = unitEnd - unitStart;
            const itemOffset = itemStartTime - unitStart;
            const itemPercent = (itemOffset / unitDuration) * 100;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition text-xs cursor-move ${
                  draggedItemId === item.id ? "opacity-50" : ""
                }`}
                onMouseDown={(e) => handleItemDragStart(e, item.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditItem(item);
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{item.name}</p>
                  <p className="text-slate-500 truncate">
                    {item.start_time
                      ? new Date(item.start_time).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}{" "}
                    ({item.duration_minutes || 0} phút)
                  </p>
                </div>
                {item.price && <span className="font-semibold text-emerald-600 shrink-0">{formatPrice(item.price)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
