import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

export type BarTone = "unit" | "item" | "inferred";

const TONES: Record<BarTone, string> = {
  unit: "bg-gradient-to-r from-brand-500 to-brand-600 text-white ring-brand-600/40",
  item: "bg-white text-slate-700 ring-slate-300",
  // Hoạt động chưa có giờ riêng — giờ đang suy ra từ chặng nên vẽ nhạt hơn.
  inferred: "bg-slate-200/90 text-slate-500 ring-slate-300",
};

const OUTSIDE_LABEL_TONES: Record<BarTone, string> = {
  unit: "text-slate-700 font-semibold",
  item: "text-slate-600",
  inferred: "text-slate-400",
};

export interface TimelineBarProps {
  left: number;
  width: number;
  tone: BarTone;
  label: ReactNode;
  meta?: ReactNode;
  dragging?: boolean;
  /** Ghost mờ khi đang kéo — không nhận sự kiện chuột. */
  preview?: boolean;
  onPointerDownBody?: (event: ReactPointerEvent) => void;
  onPointerDownStart?: (event: ReactPointerEvent) => void;
  onPointerDownEnd?: (event: ReactPointerEvent) => void;
  title?: string;
}

/** Kích thước tối thiểu để thanh vẫn bấm/kéo được khi zoom nhỏ. */
const MIN_WIDTH = 12;
/** Hẹp hơn mức này thì chữ không lọt — đẩy nhãn ra ngoài bên phải thanh. */
const LABEL_INSIDE_WIDTH = 72;
/** Chỉ hiện phần phụ (giờ/thời lượng) khi thanh đủ rộng. */
const META_WIDTH = 132;

export default function TimelineBar({
  left,
  width,
  tone,
  label,
  meta,
  dragging = false,
  preview = false,
  onPointerDownBody,
  onPointerDownStart,
  onPointerDownEnd,
  title,
}: TimelineBarProps) {
  const barWidth = Math.max(width, MIN_WIDTH);
  const compact = barWidth < LABEL_INSIDE_WIDTH;
  const showHandles = Boolean(onPointerDownStart || onPointerDownEnd) && !preview && !compact;

  return (
    <>
      <div
        title={title}
        onPointerDown={preview ? undefined : onPointerDownBody}
        style={{ left, width: barWidth }}
        className={`group/bar absolute inset-y-1 flex select-none items-center gap-1.5 overflow-hidden rounded-lg px-1.5 text-[11px] font-semibold shadow-xs ring-1 transition-shadow ${
          TONES[tone]
        } ${preview ? "pointer-events-none opacity-50" : "cursor-grab active:cursor-grabbing"} ${
          dragging ? "shadow-pop ring-2 ring-brand-400" : "hover:shadow-card"
        }`}
      >
        {showHandles && (
          <span
            onPointerDown={onPointerDownStart}
            className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-lg bg-black/10 opacity-0 transition group-hover/bar:opacity-100"
            aria-label="Kéo để đổi giờ bắt đầu"
          />
        )}

        {!compact && (
          <>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {meta && barWidth >= META_WIDTH && (
              <span className="shrink-0 whitespace-nowrap opacity-80 tnum">{meta}</span>
            )}
          </>
        )}

        {showHandles && (
          <span
            onPointerDown={onPointerDownEnd}
            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-lg bg-black/10 opacity-0 transition group-hover/bar:opacity-100"
            aria-label="Kéo để đổi giờ kết thúc"
          />
        )}
      </div>

      {/* Thanh quá hẹp thì nhãn nằm ngoài, ngay bên phải — vẫn đọc được khi zoom nhỏ. */}
      {compact && (
        <span
          className={`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 whitespace-nowrap text-[11px] ${OUTSIDE_LABEL_TONES[tone]} ${
            preview ? "opacity-50" : ""
          }`}
          style={{ left: left + barWidth + 6 }}
        >
          {label}
          {meta && <span className="ml-1.5 text-slate-400 tnum">{meta}</span>}
        </span>
      )}
    </>
  );
}
