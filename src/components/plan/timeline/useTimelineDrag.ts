import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Dayjs } from "dayjs";
import { clampTime, snapToMinutes } from "../../../shared/utils/schedule";
import type { Id } from "../../../shared/types/models";
import type { TimeScale } from "./scale";

// Engine kéo-thả cho tab Lịch trình. Dùng pointer event thô (không phải dnd-kit)
// vì ở đây cần toạ độ pixel chính xác để quy đổi ra mốc thời gian: dnd-kit chỉ
// cho biết "thả lên phần tử nào", còn ta cần "thả ở đúng phút nào".

export type DragKind = "unit" | "item";
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
  /** Con trỏ đang ở trên cột "chưa xếp lịch" -> thả sẽ gỡ chặng khỏi lịch. */
  overParking: boolean;
}

export interface UseTimelineDragOptions {
  scale: TimeScale;
  /** Phần tử có bề rộng đúng bằng `scale.width` — gốc toạ độ khi quy đổi. */
  canvasRef: RefObject<HTMLDivElement | null>;
  /** Cột "chưa xếp lịch"; thả chặng vào đây là gỡ lịch. */
  parkingRef?: RefObject<HTMLDivElement | null>;
  snapMinutes?: number;
  minMinutes?: number;
  onCommit: (draft: DragDraft) => void;
  onUnschedule?: (target: DragTarget) => void;
}

interface ActiveDrag {
  target: DragTarget;
  mode: DragMode;
  durationMs: number;
  /** Khoảng cách từ mép trái thanh tới điểm bấm (px) — giữ nguyên khi kéo. */
  grabOffsetPx: number;
}

export interface TimelineDragApi {
  draft: DragDraft | null;
  /** Bắt đầu kéo/kéo mép một thanh đã có trên lịch. */
  startDrag: (event: ReactPointerEvent, target: DragTarget, mode: DragMode) => void;
  /** Bắt đầu kéo 1 chặng chưa xếp lịch từ cột bên cạnh vào lịch. */
  startScheduling: (event: ReactPointerEvent, target: DragTarget) => void;
  isDragging: boolean;
}

function rectContains(element: HTMLElement | null | undefined, x: number, y: number): boolean {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function useTimelineDrag({
  scale,
  canvasRef,
  parkingRef,
  snapMinutes = 15,
  minMinutes = 30,
  onCommit,
  onUnschedule,
}: UseTimelineDragOptions): TimelineDragApi {
  const [draft, setDraft] = useState<DragDraft | null>(null);
  const activeRef = useRef<ActiveDrag | null>(null);
  const draftRef = useRef<DragDraft | null>(null);
  // Giữ bản mới nhất của scale/callback để listener trên window không bị "cũ".
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const unscheduleRef = useRef(onUnschedule);
  unscheduleRef.current = onUnschedule;

  const compute = useCallback(
    (clientX: number, clientY: number): DragDraft | null => {
      const active = activeRef.current;
      const canvas = canvasRef.current;
      if (!active || !canvas) return null;

      const currentScale = scaleRef.current;
      const x = clientX - canvas.getBoundingClientRect().left;
      const pointerTime = currentScale.timeAt(x);
      const minSpanMs = minMinutes * 60_000;
      const overParking = rectContains(parkingRef?.current, clientX, clientY);

      if (active.mode === "resize-start") {
        const latest = active.target.end.subtract(minSpanMs, "millisecond");
        const start = clampTime(
          snapToMinutes(pointerTime, snapMinutes),
          currentScale.origin,
          latest
        );
        return { ...active.target, mode: active.mode, start, overParking };
      }

      if (active.mode === "resize-end") {
        const earliest = active.target.start.add(minSpanMs, "millisecond");
        const end = clampTime(snapToMinutes(pointerTime, snapMinutes), earliest, currentScale.end);
        return { ...active.target, mode: active.mode, end, overParking };
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
      };
    },
    [canvasRef, minMinutes, parkingRef, snapMinutes]
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
      // Kéo từ cột "chưa xếp lịch" rồi thả lại vào chính cột đó -> huỷ, không ghi gì.
      if (active.mode === "schedule") {
        if (!final.overParking) commitRef.current(final);
        return;
      }
      if (final.overParking && final.kind === "unit" && unscheduleRef.current) {
        unscheduleRef.current(active.target);
        return;
      }
      // Bấm mà không kéo (hoặc kéo rồi về đúng chỗ cũ) thì không cần ghi DB.
      if (final.start.isSame(active.target.start) && final.end.isSame(active.target.end)) return;
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
    (event: ReactPointerEvent, target: DragTarget, mode: DragMode) => {
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
        grabOffsetPx: x - scaleRef.current.xOf(target.start),
      };
      const initial: DragDraft = { ...target, mode, overParking: false };
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
      const initial: DragDraft = { ...target, mode: "schedule", overParking: true };
      draftRef.current = initial;
      setDraft(initial);
    },
    []
  );

  return { draft, startDrag, startScheduling, isDragging: draft !== null };
}
