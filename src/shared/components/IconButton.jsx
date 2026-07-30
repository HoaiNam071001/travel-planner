import { forwardRef } from "react";

// Nút icon vuông nhỏ trên card (sửa/xoá/gỡ...). Không dùng antd Button vì cần gọn
// hơn controlHeight 38px, và cần stopPropagation mặc định vì phần lớn card bọc
// ngoài đều clickable. forwardRef để dùng được làm trigger của Popconfirm/Dropdown.
const TONES = {
  neutral: "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
  brand: "text-slate-400 hover:bg-brand-50 hover:text-brand-700",
  danger: "text-slate-400 hover:bg-rose-50 hover:text-rose-600",
  active: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    tone = "neutral",
    size = "md",
    stopPropagation = true,
    onClick,
    className = "",
    ...props
  },
  ref
) {
  const box = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const glyph = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onClick?.(e);
      }}
      className={`flex ${box} shrink-0 items-center justify-center rounded-lg transition disabled:cursor-default disabled:hover:bg-transparent ${
        TONES[tone] ?? TONES.neutral
      } ${className}`}
      {...props}
    >
      <Icon className={glyph} />
    </button>
  );
});

export default IconButton;
