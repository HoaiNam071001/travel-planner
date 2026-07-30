import { useState } from "react";
import { Settings2 } from "lucide-react";
import ManageUnitTypesModal from "./ManageUnitTypesModal";

export default function UnitTypeFilterBar({ types, selectedId, onSelect, onCreate, onDelete }) {
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span
        onClick={() => onSelect(null)}
        className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-xs transition ${
          selectedId === null
            ? "bg-cyan-600 text-white"
            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
        }`}
      >
        Tất cả
      </span>
      {types.map((t) => {
        const selected = t.id === selectedId;
        return (
          <span
            key={t.id}
            onClick={() => onSelect(selected ? null : t.id)}
            className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-xs transition ${
              selected
                ? "bg-cyan-600 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {t.name}
          </span>
        );
      })}
      <button
        type="button"
        onClick={() => setManageOpen(true)}
        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700"
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
