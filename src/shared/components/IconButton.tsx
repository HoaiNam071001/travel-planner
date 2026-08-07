import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";

const TONES = {
  neutral: "text-text-muted hover:bg-surface-secondary hover:text-text-primary",
  brand: "text-text-muted hover:bg-primary/12 hover:text-primary",
  danger: "text-text-muted hover:bg-danger/12 hover:text-danger",
  active: "bg-primary/12 text-primary hover:bg-primary/18",
} as const;

export type IconButtonTone = keyof typeof TONES;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  icon: LucideIcon;
  tone?: IconButtonTone;
  size?: "sm" | "md";
  stopPropagation?: boolean;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
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
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (stopPropagation) event.stopPropagation();
        onClick?.(event);
      }}
      className={`flex ${box} shrink-0 items-center justify-center rounded-lg transition disabled:cursor-default disabled:hover:bg-transparent ${TONES[tone]} ${className}`}
      {...props}
    >
      <Icon className={glyph} />
    </button>
  );
});

export default IconButton;
