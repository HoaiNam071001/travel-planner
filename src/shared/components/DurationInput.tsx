import { InputNumber } from "antd";

// Gộp "giờ" + "phút" thành 1 khối duy nhất — thay cho 2 Field/InputNumber tách rời.
// value/onChange làm việc thuần bằng tổng số phút, việc tách giờ/phút chỉ là hiển thị.
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
  const hours = Math.floor(Math.max(value, 0) / 60);
  const minutes = Math.max(value, 0) % 60;

  return (
    <div
      className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 transition ${
        disabled ? "opacity-60" : "focus-within:border-brand-300"
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
      <span className="shrink-0 text-xs text-slate-400">giờ</span>
      <span className="h-4 w-px shrink-0 bg-slate-200" />
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
      <span className="shrink-0 text-xs text-slate-400">phút</span>
    </div>
  );
}
