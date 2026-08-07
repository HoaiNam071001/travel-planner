import { Dropdown, Popconfirm } from "antd";
import {
  CalendarClock,
  Clock,
  CornerUpRight,
  Inbox,
  MapPin,
  Pencil,
  Route as RouteIcon,
  Trash2,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatPrice, formatPriceShort, formatDuration, formatTime } from "../../shared/utils/format";
import { itemDurationMinutes, itemRange } from "../../shared/utils/schedule";
import IconButton from "../../shared/components/IconButton";
import type { Id, Item } from "../../shared/types/models";
import { laneItemAccent, type MoveTarget } from "./BoardLane";
import type { UnitColor } from "./timeline/colors";

interface MoveMenuProps {
  itemId: Id;
  laneId: Id;
  moveTargets: MoveTarget[];
  onMoveTo: (itemId: Id, toLane: Id) => void;
}

/**
 * NÃºt "Chuyá»ƒn tá»›iâ€¦" â€” Ä‘á»•i cháº·ng cho 1 hoáº¡t Ä‘á»™ng mÃ  khÃ´ng cáº§n kÃ©o. KÃ©o ngang qua chá»¥c lane
 * lÃ  thao tÃ¡c cá»±c nháº¥t cá»§a board, nÃªn Ä‘Ã¢y má»›i lÃ  cÃ¡ch chÃ­nh; kÃ©o chá»‰ Ä‘á»ƒ sáº¯p thá»© tá»±.
 */
function MoveMenu({ itemId, laneId, moveTargets, onMoveTo }: MoveMenuProps) {
  const targets = moveTargets.filter((t) => t.id !== laneId);
  if (targets.length === 0) return null;

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        items: targets.map((target) => ({
          key: target.id,
          icon: target.isLibrary ? (
            <Inbox className="h-4 w-4" />
          ) : (
            <RouteIcon className="h-4 w-4" />
          ),
          label: target.name,
          onClick: () => onMoveTo(itemId, target.id),
        })),
      }}
    >
      <IconButton size="sm" icon={CornerUpRight} title="Chuyá»ƒn tá»›i cháº·ng khÃ¡c" aria-label="Chuyá»ƒn tá»›i cháº·ng khÃ¡c" />
    </Dropdown>
  );
}

export interface BoardItemCardProps {
  item: Item;
  laneId: Id;
  /** MÃ u cháº·ng cha (tá»« `colors.ts`) â€” undefined á»Ÿ lane kho (khÃ´ng tÃ´ mÃ u). */
  laneColor?: UnitColor;
  /** Thá»© tá»± trong lane â€” chá»n sáº¯c thÃ¡i xoay vÃ²ng cho `laneColor`. */
  itemIndex?: number;
  moveTargets: MoveTarget[];
  onMoveTo: (itemId: Id, toLane: Id) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: Id) => void;
}

/**
 * Tháº» hoáº¡t Ä‘á»™ng á»Ÿ cháº¿ Ä‘á»™ "sáº¯p hoáº¡t Ä‘á»™ng": kÃ©o Ä‘Æ°á»£c báº±ng cáº£ tháº» (PointerSensor cÃ³
 * activationConstraint distance 5 nÃªn báº¥m nÃºt bÃªn trong váº«n Äƒn).
 */
export default function BoardItemCard({
  item,
  laneId,
  laneColor,
  itemIndex = 0,
  moveTargets,
  onMoveTo,
  onEdit,
  onDelete,
}: BoardItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", laneId },
  });

  const range = itemRange(item);
  const minutes = itemDurationMinutes(item);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group cursor-grab rounded-xl border p-2.5 shadow-xs transition active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-card"
      } ${laneItemAccent(laneColor, itemIndex)}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-text-primary">
          {item.name}
        </p>

        {/* Actions chá»‰ hiá»‡n khi hover Ä‘á»ƒ tháº» Ä‘á»¡ rá»‘i. `stopPropagation` á»Ÿ pointerdown Ä‘á»ƒ
            báº¥m nÃºt khÃ´ng bá»‹ hiá»ƒu nháº§m thÃ nh báº¯t Ä‘áº§u kÃ©o tháº». */}
        <div
          onPointerDown={(event) => event.stopPropagation()}
          className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
        >
          <MoveMenu itemId={item.id} laneId={laneId} moveTargets={moveTargets} onMoveTo={onMoveTo} />
          <IconButton
            size="sm"
            tone="brand"
            icon={Pencil}
            onClick={() => onEdit(item)}
            aria-label="Sá»­a hoáº¡t Ä‘á»™ng"
          />
          <Popconfirm
            title="XoÃ¡ hoáº¡t Ä‘á»™ng nÃ y?"
            okText="XoÃ¡"
            cancelText="Huá»·"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(item.id)}
          >
            <IconButton size="sm" tone="danger" icon={Trash2} aria-label="XoÃ¡ hoáº¡t Ä‘á»™ng" />
          </Popconfirm>
        </div>
      </div>

      {range && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-primary tnum">
          <CalendarClock className="h-3 w-3 shrink-0" />
          {formatTime(range.start)} - {formatTime(range.end)}
        </p>
      )}

      {item.locations?.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-text-secondary">
          <MapPin className="h-3 w-3 shrink-0 text-text-muted" />
          <span className="truncate">{item.locations.map((l) => l.name).join(" â†’ ")}</span>
        </p>
      )}

      {(minutes > 0 || item.price != null) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-text-secondary">
          {minutes > 0 && (
            <span className="inline-flex items-center gap-1 font-mono tnum">
              <Clock className="h-3 w-3 text-text-muted" />
              {formatDuration(minutes)}
            </span>
          )}
          {item.price != null && Number(item.price) > 0 && (
            <span className="ml-auto font-semibold text-text-primary tnum">
              {formatPrice(item.price)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export interface BoardItemRowProps {
  item: Item;
  laneId: Id;
  laneColor?: UnitColor;
  moveTargets: MoveTarget[];
  onMoveTo: (itemId: Id, toLane: Id) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: Id) => void;
}

/**
 * Báº£n 1 dÃ²ng cá»§a tháº» hoáº¡t Ä‘á»™ng, dÃ¹ng á»Ÿ cháº¿ Ä‘á»™ "sáº¯p cháº·ng": khÃ´ng kÃ©o Ä‘Æ°á»£c (Ä‘ang kÃ©o cháº·ng),
 * chá»‰ Ä‘á»ƒ nhÃ¬n lÆ°á»›t ná»™i dung tá»«ng cháº·ng â€” nÃªn rÃºt xuá»‘ng 1 dÃ²ng cho lane tháº­t tháº¥p.
 */
export function BoardItemRow({
  item,
  laneId,
  laneColor,
  moveTargets,
  onMoveTo,
  onEdit,
  onDelete,
}: BoardItemRowProps) {
  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg border px-2 py-1 transition ${
        laneColor
          ? `border-l-[3px] ${laneColor.accentBorder} border-y-border/10 border-r-border/10 bg-surface-elevated/72`
          : "border-border/10 bg-surface"
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-text-primary">
        {item.name}
      </span>
      {item.price != null && Number(item.price) > 0 && (
        <span className="shrink-0 text-[10px] font-semibold text-success tnum group-hover:hidden">
          {formatPriceShort(item.price)}
        </span>
      )}
      <span className="hidden shrink-0 gap-0.5 group-hover:flex focus-within:flex">
        <MoveMenu itemId={item.id} laneId={laneId} moveTargets={moveTargets} onMoveTo={onMoveTo} />
        <IconButton
          size="sm"
          tone="brand"
          icon={Pencil}
          onClick={() => onEdit(item)}
          aria-label="Sá»­a hoáº¡t Ä‘á»™ng"
        />
        <Popconfirm
          title="XoÃ¡ hoáº¡t Ä‘á»™ng nÃ y?"
          okText="XoÃ¡"
          cancelText="Huá»·"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(item.id)}
        >
          <IconButton size="sm" tone="danger" icon={Trash2} aria-label="XoÃ¡ hoáº¡t Ä‘á»™ng" />
        </Popconfirm>
      </span>
    </div>
  );
}

// Báº£n rÃºt gá»n dÃ¹ng cho DragOverlay (khÃ´ng gáº¯n sortable, khÃ´ng cÃ³ action).
export function BoardItemPreview({ item }: { item: Item }) {
  return (
    <div className="w-[248px] rotate-1 cursor-grabbing rounded-xl border border-primary/18 bg-surface-elevated/82 p-2.5 shadow-pop">
      <p className="text-[13px] font-semibold leading-snug text-text-primary">{item.name}</p>
      {item.locations?.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-text-secondary">
          <MapPin className="h-3 w-3 shrink-0 text-text-muted" />
          <span className="truncate">{item.locations.map((l) => l.name).join(" â†’ ")}</span>
        </p>
      )}
    </div>
  );
}

