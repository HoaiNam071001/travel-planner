import { useState, type ReactNode } from "react";
import { Settings2 } from "lucide-react";
import ManageUnitTypesModal from "./ManageUnitTypesModal";
import type { Id, UnitType } from "../shared/types/models";

export interface UnitTypeFilterBarProps {
  types: UnitType[];
  selectedId: Id | null;
  onSelect: (id: Id | null) => void;
  onCreate: (name: string) => Promise<UnitType | null>;
  onDelete: (id: Id) => void;
}

export default function UnitTypeFilterBar({
  types,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
}: UnitTypeFilterBarProps) {
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip active={selectedId === null} onClick={() => onSelect(null)}>
        Tất cả
      </Chip>
      {types.map((type) => (
        <Chip
          key={type.id}
          active={type.id === selectedId}
          onClick={() => onSelect(type.id === selectedId ? null : type.id)}
        >
          {type.name}
        </Chip>
      ))}

      <button
        type="button"
        onClick={() => setManageOpen(true)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-elevated/68 hover:text-text-primary"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Quản lý loại
      </button>

      <ManageUnitTypesModal
        open={manageOpen}
        types={types}
        onClose={() => setManageOpen(false)}
        onCreate={onCreate}
        onDelete={onDelete}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
        active
          ? "gradient-brand text-white ring-transparent shadow-xs"
          : "bg-surface-elevated text-text-secondary ring-border/60 hover:bg-surface-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
