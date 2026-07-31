import { useEffect, useRef } from "react";
import L from "leaflet";
import { Layers } from "lucide-react";
import { BASEMAPS, type BasemapKey } from "../map/basemaps";

export interface MapBasemapSwitcherProps {
  value: BasemapKey;
  onChange: (key: BasemapKey) => void;
  className?: string;
}

/**
 * Pill đổi lớp nền bản đồ (Sáng/Vệ tinh), dùng chung cho mọi `MapContainer`. Render
 * bên trong `MapContainer` nên phải tự chặn sự kiện chuột lan xuống Leaflet, nếu không
 * bấm nút sẽ kéo cả bản đồ.
 */
export default function MapBasemapSwitcher({ value, onChange, className }: MapBasemapSwitcherProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    L.DomEvent.disableClickPropagation(node);
    L.DomEvent.disableScrollPropagation(node);
  }, []);

  return (
    <div
      ref={ref}
      className={`pointer-events-auto flex items-center gap-0.5 rounded-full bg-white/95 p-1 shadow-pop ring-1 ring-slate-200/80 backdrop-blur ${className ?? ""}`}
    >
      <span className="pl-2 pr-1 text-slate-400">
        <Layers className="h-3.5 w-3.5" />
      </span>
      {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            value === key
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
        >
          {BASEMAPS[key].label}
        </button>
      ))}
    </div>
  );
}
