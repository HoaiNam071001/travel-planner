import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Dayjs } from "dayjs";
import { clampTime, snapToMinutes } from "../../../shared/utils/schedule";
import type { Id } from "../../../shared/types/models";
import type { TimeScale } from "./scale";

// Engine kéo-thả cho tab Lịch trình. Dùng pointer event thô (không phải dnd-kit)
// vì ở đây cần toạ độ pixel chính xác để quy đổi ra mốc thời gian: dnd-kit chỉ
// cho biết "thả lên phần tử nào", còn ta cần "thả ở đúng phút nào".

export type DragKind = "unit" | "item" | "expense";
export type DragMode = "move" | "resize-start" | "resize-end" | "schedule";

export interface DragTarget {
  kind: DragKind;
  id: Id;
  /** Chặng cha — chỉ có với hoạt động, để giới hạn/không giới hạn theo chặng. */
  parentId?: Id;
  start: Dayjs;
  end: Dayjs;
}

export interface DragDraft extends DragTarget {
  mode: DragMode;
  /** Con trỏ đang ở trên vùng thả để gỡ lịch (theo đúng kind) -> thả sẽ gỡ khỏi lịch. */
  overParking: boolean;
  /**
   * Id của hàng chặng đang ở dưới con trỏ — chỉ có ý nghĩa khi kéo 1 hoạt động chưa gắn
   * chặng (kind "item", mode "schedule") từ panel vào gantt: xác định thả vào chặng nào.
   */
  overRowId: Id | null;
}

export interface UseTimelineDragOptions {
  scale: TimeScale;
  /** Phần tử có bề rộng đúng bằng `scale.width` — gốc toạ độ khi quy đổi. */
  canvasRef: RefObject<HTMLDivElement | null>;
  /** Panel "chặng chưa xếp"; thả 1 chặng vào đây là gỡ lịch. */
  unitParkingRef?: RefObject<HTMLDivElement | null>;
  /** Panel "hoạt động chưa gắn chặng"; thả 1 hoạt động vào đây là gỡ khỏi chặng. */
  itemParkingRef?: RefObject<HTMLDivElement | null>;
  /** Panel "chi phí chưa xếp lịch"; thả 1 khoản chi phí vào đây là gỡ giờ. */
  expenseParkingRef?: RefObject<HTMLDivElement | null>;
  /**
   * Tìm id chặng đang ở dưới con trỏ (dùng DOM `elementFromPoint` + `closest` trên
   * `data-unit-row-id` do `PlanTimeline` gắn lên từng hàng) — chỉ cần khi kéo 1 hoạt
   * động chưa gắn chặng từ panel vào gantt để biết thả vào chặng nào.
   */
  resolveRowTarget?: (clientX: number, clientY: number) => Id | null;
  snapMinutes?: number;
  minMinutes?: number;
  onCommit: (draft: DragDraft) => void;
  onUnschedule?: (target: DragTarget) => void;
}

interface ActiveDrag {
  target: DragTarget;
  mode: DragMode;
  durationMs: number;
  /** Khoảng cách từ mép trái thanh **đã render** tới điểm bấm (px) — giữ nguyên khi kéo. */
  grabOffsetPx: number;
}

export interface TimelineDragApi {
  draft: DragDraft | null;
  /**
   * Bắt đầu kéo/kéo mép một thanh đã có trên lịch. `renderedLeft` là toạ độ trái (px,
   * trong hệ canvas) mà thanh **đang thực sự hiển thị** — có thể khác `scale.xOf(target.start)`
   * khi thanh bị kẹp vào rìa canvas (chặng/hoạt động có ngày ngoài khung kế hoạch), nếu
   * không dùng đúng toạ độ đã render thì lúc bắt đầu kéo thanh sẽ bị giật do offset sai.
   */
  startDrag: (
    event: ReactPointerEvent,
    target: DragTarget,
    mode: DragMode,
    renderedLeft: number
  ) => void;
  /** Bắt đầu kéo 1 chặng/hoạt động chưa xếp lịch từ panel bên trên vào lịch. */
  startScheduling: (event: ReactPointerEvent, target: DragTarget) => void;
  isDragging: boolean;
  /**
   * `true` nếu lần nhấn-thả gần nhất thực sự dời thanh (start/end đổi). Vì `startDrag`
   * không gọi `setPointerCapture`, con trỏ luôn "thả" đúng lên thanh đang kéo nên trình
   * duyệt luôn bắn thêm 1 sự kiện `click` ngay sau `pointerup` — kể cả sau một cú kéo
   * thật. Đọc ref này (đồng bộ, không qua state) ngay trong handler `onClick` để phân
   * biệt "bấm mở chi tiết" với "vừa kéo xong".
   */
  wasDraggedRef: RefObject<boolean>;
}

function rectContains(element: HTMLElement | null | undefined, x: number, y: number): boolean {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function useTimelineDrag({
  scale,
  canvasRef,
  unitParkingRef,
  itemParkingRef,
  expenseParkingRef,
  resolveRowTarget,
  snapMinutes = 15,
  minMinutes = 30,
  onCommit,
  onUnschedule,
}: UseTimelineDragOptions): TimelineDragApi {
  const [draft, setDraft] = useState<DragDraft | null>(null);
  const activeRef = useRef<ActiveDrag | null>(null);
  const draftRef = useRef<DragDraft | null>(null);
  const wasDraggedRef = useRef(false);
  // Giữ bản mới nhất của scale/callback để listener trên window không bị "cũ".
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const unscheduleRef = useRef(onUnschedule);
  unscheduleRef.current = onUnschedule;

  const parkingRefFor = useCallback(
    (kind: DragKind) => {
      if (kind === "unit") return unitParkingRef;
      if (kind === "expense") return expenseParkingRef;
      return itemParkingRef;
    },
    [unitParkingRef, itemParkingRef, expenseParkingRef]
  );

  const compute = useCallback(
    (clientX: number, clientY: number): DragDraft | null => {
      const active = activeRef.current;
      const canvas = canvasRef.current;
      if (!active || !canvas) return null;

      const currentScale = scaleRef.current;
      const x = clientX - canvas.getBoundingClientRect().left;
      const pointerTime = currentScale.timeAt(x);
      const minSpanMs = minMinutes * 60_000;
      const overParking = rectContains(parkingRefFor(active.target.kind)?.current, clientX, clientY);
      // Chỉ cần biết đang ở trên hàng chặng nào khi kéo 1 hoạt động từ panel vào gantt.
      const overRowId =
        active.target.kind === "item" && active.mode === "schedule" && resolveRowTarget
          ? resolveRowTarget(clientX, clientY)
          : null;

      if (active.mode === "resize-start") {
        const latest = active.target.end.subtract(minSpanMs, "millisecond");
        const start = clampTime(
          snapToMinutes(pointerTime, snapMinutes),
          currentScale.origin,
          latest
        );
        return { ...active.target, mode: active.mode, start, overParking, overRowId };
      }

      if (active.mode === "resize-end") {
        const earliest = active.target.start.add(minSpanMs, "millisecond");
        const end = clampTime(snapToMinutes(pointerTime, snapMinutes), earliest, currentScale.end);
        return { ...active.target, mode: active.mode, end, overParking, overRowId };
      }

      // move | schedule: giữ nguyên độ dài, chỉ dời điểm bắt đầu.
      const rawStart = currentScale.timeAt(x - active.grabOffsetPx);
      const start = clampTime(
        snapToMinutes(rawStart, snapMinutes),
        currentScale.origin,
        currentScale.end.subtract(active.durationMs, "millisecond")
      );
      return {
        ...active.target,
        mode: active.mode,
        start,
        end: start.add(active.durationMs, "millisecond"),
        overParking,
        overRowId,
      };
    },
    [canvasRef, minMinutes, parkingRefFor, resolveRowTarget, snapMinutes]
  );

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      if (!activeRef.current) return;
      event.preventDefault();
      const next = compute(event.clientX, event.clientY);
      draftRef.current = next;
      setDraft(next);
    }

    function handleUp(event: PointerEvent) {
      const active = activeRef.current;
      if (!active) return;
      const final = compute(event.clientX, event.clientY) ?? draftRef.current;
      activeRef.current = null;
      draftRef.current = null;
      setDraft(null);

      if (!final) return;
      // Kéo từ panel "chưa xếp" rồi thả lại vào chính panel đó -> huỷ, không ghi gì.
      if (active.mode === "schedule") {
        if (!final.overParking) commitRef.current(final);
        return;
      }
      // Bấm mà không kéo (hoặc kéo rồi về đúng chỗ cũ) thì không cần ghi DB — đồng thời
      // đây chính là tín hiệu để phân biệt "click mở chi tiết" với "vừa kéo xong".
      wasDraggedRef.current = !(
        final.start.isSame(active.target.start) && final.end.isSame(active.target.end)
      );
      if (final.overParking && unscheduleRef.current) {
        unscheduleRef.current(active.target);
        return;
      }
      if (!wasDraggedRef.current) return;
      commitRef.current(final);
    }

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [compute]);

  const startDrag = useCallback(
    (event: ReactPointerEvent, target: DragTarget, mode: DragMode, renderedLeft: number) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const x = event.clientX - canvas.getBoundingClientRect().left;

      activeRef.current = {
        target,
        mode,
        durationMs: Math.max(target.end.diff(target.start), 0),
        grabOffsetPx: x - renderedLeft,
      };
      const initial: DragDraft = { ...target, mode, overParking: false, overRowId: null };
      draftRef.current = initial;
      setDraft(initial);
    },
    [canvasRef]
  );

  const startScheduling = useCallback(
    (event: ReactPointerEvent, target: DragTarget) => {
      if (event.button !== 0) return;
      event.preventDefault();

      activeRef.current = {
        target,
        mode: "schedule",
        durationMs: Math.max(target.end.diff(target.start), 0),
        // Kéo từ ngoài vào thì mép trái thanh bám luôn vào con trỏ.
        grabOffsetPx: 0,
      };
      const initial: DragDraft = { ...target, mode: "schedule", overParking: true, overRowId: null };
      draftRef.current = initial;
      setDraft(initial);
    },
    []
  );

  return { draft, startDrag, startScheduling, isDragging: draft !== null, wasDraggedRef };
}
