import { InputNumber } from "antd";
import { useTranslation } from "../../i18n/useAppTranslation";

export interface DurationInputProps {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function DurationInput({
  value,
  onChange,
  disabled = false,
  className = "",
}: DurationInputProps) {
  const { t } = useTranslation("forms");
  const hours = Math.floor(Math.max(value, 0) / 60);
  const minutes = Math.max(value, 0) % 60;

  return (
    <div
      className={`flex items-center gap-1 rounded-xl border border-border/10 bg-surface-elevated/72 px-2 py-1 transition ${
        disabled ? "opacity-60" : "focus-within:border-primary/20 focus-within:bg-surface-elevated"
      } ${className}`}
    >
      <InputNumber
        className="w-full"
        variant="borderless"
        size="small"
        min={0}
        disabled={disabled}
        value={hours}
        onChange={(val) => onChange((val ?? 0) * 60 + minutes)}
      />
      <span className="shrink-0 text-xs text-text-muted">{t("forms:durationUnit.hours")}</span>
      <span className="h-4 w-px shrink-0 bg-border/20" />
      <InputNumber
        className="w-full"
        variant="borderless"
        size="small"
        min={0}
        max={59}
        disabled={disabled}
        value={minutes}
        onChange={(val) => onChange(hours * 60 + (val ?? 0))}
      />
      <span className="shrink-0 text-xs text-text-muted">{t("forms:durationUnit.minutes")}</span>
    </div>
  );
}
