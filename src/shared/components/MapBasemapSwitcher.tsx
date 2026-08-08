import { useEffect, useRef } from "react";
import L from "leaflet";
import { Layers } from "lucide-react";
import { useTranslation } from "../../i18n/useAppTranslation";
import { BASEMAPS, type BasemapKey } from "../map/basemaps";

const LABEL_KEY: Record<BasemapKey, string> = {
  voyager: "locations:map.basemapVoyager",
  satellite: "locations:map.basemapSatellite",
};

export interface MapBasemapSwitcherProps {
  value: BasemapKey;
  onChange: (key: BasemapKey) => void;
  className?: string;
}

export default function MapBasemapSwitcher({ value, onChange, className }: MapBasemapSwitcherProps) {
  const { t } = useTranslation("locations");
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
      className={`pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-surface-elevated p-1 shadow-pop backdrop-blur ${className ?? ""}`}
    >
      <span className="pl-2 pr-1 text-text-muted">
        <Layers className="h-3.5 w-3.5" />
      </span>
      {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            value === key
              ? "bg-primary text-white shadow-sm"
              : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
          }`}
        >
          {t(LABEL_KEY[key])}
        </button>
      ))}
    </div>
  );
}
