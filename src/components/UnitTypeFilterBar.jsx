import { useState } from "react";
import { Settings2 } from "lucide-react";
import ManageUnitTypesModal from "./ManageUnitTypesModal";

export default function UnitTypeFilterBar({ types, selectedId, onSelect, onCreate, onDelete }) {
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
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
        active
          ? "bg-brand-600 text-white ring-brand-600"
          : "bg-white text-slate-600 ring-slate-200 hover:ring-brand-300"
      }`}
    >
      {children}
    </button>
  );
}
