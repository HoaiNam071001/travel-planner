import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Id } from "../../../shared/types/models";

// Kéo-thả sắp lại THỨ TỰ (order_index) của chặng/hoạt động trên tab Lịch trình.
//
// Không dùng dnd-kit ở đây (dù dự án có sẵn) vì gantt vẽ mỗi hàng thành 2 mảnh
// nằm ở 2 nhánh DOM khác nhau — nhãn ở cột trái sticky, thanh ở canvas bên phải.
// dnd-kit chỉ biết dịch chuyển đúng phần tử nó quản lý, nên nhãn sẽ trôi còn
// thanh thì đứng yên. Ở đây ta chỉ tính ra MỘT mảng id đã sắp lại rồi cho cả 2
// cột cùng render theo mảng đó, nên 2 bên luôn khớp nhau.
//
// `group` phân biệt các danh sách sắp xếp độc lập: "units" cho danh sách chặng,
// `items:<unitId>` cho danh sách hoạt động trong 1 chặng (không kéo chéo chặng
// được — đổi chặng là việc của tab Xây dựng).

export interface RowReorderDraft {
  group: string;
  activeId: Id;
  /** Thứ tự đang xem trước (đã áp dụng vị trí kéo hiện tại). */
  ids: Id[];
}

interface Slot {
  id: Id;
  midY: number;
}

interface ActiveReorder {
  group: string;
  activeId: Id;
  originalIds: Id[];
  /** Vị trí giữa (theo trục Y, toạ độ viewport) của các hàng KHÁC, đo lúc bắt đầu kéo. */
  others: Slot[];
}

export interface RowReorderApi {
  draft: RowReorderDraft | null;
  /** Gắn vào `onPointerDown` của tay cầm kéo (grip) trên từng hàng. */
  start: (event: ReactPointerEvent, group: string, ids: Id[], activeId: Id) => void;
  /** Trả về thứ tự nên render cho `group` — bản xem trước khi đang kéo, gốc khi không. */
  orderOf: (group: string, ids: Id[]) => Id[];
  isReordering: boolean;
}

/** Đo vị trí giữa của từng hàng trong 1 group qua `data-reorder-*` gắn ở cột nhãn. */
function measure(group: string, excludeId: Id): Slot[] {
  const nodes = document.querySelectorAll<HTMLElement>(
    `[data-reorder-group="${CSS.escape(group)}"][data-reorder-id]`
  );
  const slots: Slot[] = [];
  for (const node of nodes) {
    const id = node.dataset.reorderId;
    if (!id || id === excludeId) continue;
    const rect = node.getBoundingClientRect();
    slots.push({ id, midY: rect.top + rect.height / 2 });
  }
  return slots.sort((a, b) => a.midY - b.midY);
}

export function useRowReorder(onCommit: (group: string, ids: Id[]) => void): RowReorderApi {
  const [draft, setDraft] = useState<RowReorderDraft | null>(null);
  const activeRef = useRef<ActiveReorder | null>(null);
  const draftRef = useRef<RowReorderDraft | null>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const compute = useCallback((clientY: number): RowReorderDraft | null => {
    const active = activeRef.current;
    if (!active) return null;
    // Chèn vào sau tất cả các hàng có tâm nằm TRÊN con trỏ.
    const insertAt = active.others.filter((slot) => slot.midY < clientY).length;
    const ids = active.others.map((slot) => slot.id);
    ids.splice(insertAt, 0, active.activeId);
    return { group: active.group, activeId: active.activeId, ids };
  }, []);

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      if (!activeRef.current) return;
      event.preventDefault();
      const next = compute(event.clientY);
      draftRef.current = next;
      setDraft(next);
    }

    function handleUp(event: PointerEvent) {
      const active = activeRef.current;
      if (!active) return;
      const final = compute(event.clientY) ?? draftRef.current;
      activeRef.current = null;
      draftRef.current = null;
      setDraft(null);

      if (!final) return;
      const changed = final.ids.some((id, index) => id !== active.originalIds[index]);
      if (changed) commitRef.current(final.group, final.ids);
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

  const start = useCallback(
    (event: ReactPointerEvent, group: string, ids: Id[], activeId: Id) => {
      if (event.button !== 0 || ids.length < 2) return;
      event.preventDefault();
      // Grip nằm bên trong nhãn (nhãn có onClick mở modal) nên phải chặn nổi bọt.
      event.stopPropagation();

      activeRef.current = {
        group,
        activeId,
        originalIds: ids,
        others: measure(group, activeId),
      };
      const initial: RowReorderDraft = { group, activeId, ids };
      draftRef.current = initial;
      setDraft(initial);
    },
    []
  );

  const orderOf = useCallback(
    (group: string, ids: Id[]) => (draft && draft.group === group ? draft.ids : ids),
    [draft]
  );

  return { draft, start, orderOf, isReordering: draft !== null };
}
