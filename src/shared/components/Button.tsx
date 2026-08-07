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
    "!border-transparent !bg-[image:var(--gradient-brand)] !text-white shadow-card hover:!brightness-[1.04] hover:shadow-card-hover",
  default:
    "!border-border/70 !bg-surface-elevated !text-text-primary shadow-xs hover:!border-primary/30 hover:!bg-surface-secondary/60",
  text: "!border-transparent !bg-transparent !text-text-secondary hover:!bg-surface-secondary/70 hover:!text-text-primary",
  danger:
    "!border-transparent !bg-[linear-gradient(135deg,rgba(239,68,68,0.94),rgba(220,38,38,0.9))] !text-white shadow-card hover:!brightness-[1.04] hover:shadow-card-hover",
};

export interface ButtonProps extends Omit<AntButtonProps, "type" | "danger" | "variant"> {
  variant?: ButtonVariant;
}

export default function Button({ variant = "default", className = "", ...props }: ButtonProps) {
  return (
    <AntButton
      type={TYPE_BY_VARIANT[variant]}
      danger={variant === "danger"}
      className={`before:!hidden after:!hidden !h-10 !rounded-xl !border !px-4 !text-sm !font-medium !shadow-none !outline-none transition-all duration-200 ${CLASSNAME_BY_VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}
