import { Button as AntButton, type ButtonProps as AntButtonProps } from "antd";

export type ButtonVariant = "primary" | "default" | "text" | "danger";

const TYPE_BY_VARIANT: Record<ButtonVariant, AntButtonProps["type"]> = {
  primary: "primary",
  default: "default",
  text: "text",
  danger: "primary",
};

const CLASSNAME_BY_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "!border-transparent !bg-[linear-gradient(135deg,rgba(34,211,238,0.96),rgba(37,99,235,0.92),rgba(79,70,229,0.88))] !text-white shadow-[0_18px_40px_-24px_rgba(14,165,233,0.65)] hover:!brightness-[1.03] hover:shadow-[0_22px_48px_-26px_rgba(14,165,233,0.72)]",
  default:
    "!border-border/16 !bg-surface-elevated/88 !text-text-primary shadow-[0_14px_28px_-24px_rgba(15,23,42,0.2)] hover:!border-primary/12 hover:!bg-surface-elevated",
  text: "!border-transparent !bg-transparent !text-text-secondary hover:!bg-surface-secondary/70 hover:!text-text-primary",
  danger:
    "!border-transparent !bg-[linear-gradient(135deg,rgba(239,68,68,0.96),rgba(190,24,93,0.88))] !text-white shadow-[0_18px_40px_-24px_rgba(239,68,68,0.45)] hover:!brightness-[1.03]",
};

export interface ButtonProps extends Omit<AntButtonProps, "type" | "danger" | "variant"> {
  variant?: ButtonVariant;
}

export default function Button({ variant = "default", className = "", ...props }: ButtonProps) {
  return (
    <AntButton
      type={TYPE_BY_VARIANT[variant]}
      danger={variant === "danger"}
      className={`before:!hidden after:!hidden !h-10 !rounded-2xl !border !px-4 !text-sm !font-medium !shadow-none !outline-none transition-all duration-200 ${CLASSNAME_BY_VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}
