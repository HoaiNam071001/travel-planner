import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

// Thanh trên gantt giờ chỉ là 1 khối màu (tên/giờ đã hiện ở cột nhãn bên trái + popover
// khi hover) — bỏ hẳn phần render chữ trong thanh, đơn giản hoá hẳn logic "hẹp quá thì
// đẩy nhãn ra ngoài" trước đây.

export interface TimelineBarProps {
  left: number;
  width: number;
  /** Class màu nền + ring, lấy từ `unitColor()` (xem `colors.ts`). */
  colorClass: string;
  dragging?: boolean;
  /** Ghost mờ khi đang kéo — không nhận sự kiện chuột. */
  preview?: boolean;
  /** Thanh gốc bắt đầu trước khung nhìn kế hoạch — hiện mũi tên gợi ý kéo vào. */
  clippedLeft?: boolean;
  /** Thanh gốc kết thúc sau khung nhìn kế hoạch. */
  clippedRight?: boolean;
  onPointerDownBody?: (event: ReactPointerEvent) => void;
  onPointerDownStart?: (event: ReactPointerEvent) => void;
  onPointerDownEnd?: (event: ReactPointerEvent) => void;
  /** Bấm (không kéo) để xem chi tiết — caller tự lọc click-sau-khi-kéo qua `wasDraggedRef`. */
  onClick?: () => void;
  title?: string;
}

/** Hẹp hơn mức này thì ẩn tay cầm resize để tránh 2 tay cầm đè lên nhau. */
const HANDLE_MIN_WIDTH = 22;

export default function TimelineBar({
  left,
  width,
  colorClass,
  dragging = false,
  preview = false,
  clippedLeft = false,
  clippedRight = false,
  onPointerDownBody,
  onPointerDownStart,
  onPointerDownEnd,
  onClick,
  title,
}: TimelineBarProps) {
  const showHandles =
    Boolean(onPointerDownStart || onPointerDownEnd) && !preview && width >= HANDLE_MIN_WIDTH;

  return (
    <div
      title={title}
      onPointerDown={preview ? undefined : onPointerDownBody}
      onClick={preview ? undefined : onClick}
      style={{ left, width }}
      className={`group/bar absolute inset-y-1 flex select-none items-center overflow-hidden rounded-lg shadow-xs ring-1 transition-shadow ${colorClass} ${
        preview ? "pointer-events-none opacity-50" : "cursor-grab active:cursor-grabbing"
      } ${dragging ? "shadow-pop ring-2 ring-brand-400" : "hover:shadow-card"}`}
    >
      {clippedLeft && (
        <ChevronLeft className="pointer-events-none absolute left-0 h-full w-3.5 shrink-0 opacity-80" />
      )}
      {clippedRight && (
        <ChevronRight className="pointer-events-none absolute right-0 h-full w-3.5 shrink-0 opacity-80" />
      )}

      {showHandles && (
        <span
          onPointerDown={onPointerDownStart}
          className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-lg bg-black/10 opacity-0 transition group-hover/bar:opacity-100"
          aria-label="Kéo để đổi giờ bắt đầu"
        />
      )}
      {showHandles && (
        <span
          onPointerDown={onPointerDownEnd}
          className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-lg bg-black/10 opacity-0 transition group-hover/bar:opacity-100"
          aria-label="Kéo để đổi giờ kết thúc"
        />
      )}
    </div>
  );
}
