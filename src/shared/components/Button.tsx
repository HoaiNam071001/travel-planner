import { Button as AntButton, type ButtonProps as AntButtonProps } from "antd";

export type ButtonVariant = "primary" | "default" | "text" | "danger";

const TYPE_BY_VARIANT: Record<ButtonVariant, AntButtonProps["type"]> = {
  primary: "primary",
  default: "default",
  text: "text",
  danger: "primary",
};

// `variant` của antd v6 (solid/outlined/...) bị che có chủ ý: trong app này
// `variant` là ngôn ngữ của design system (primary/default/text/danger).
export interface ButtonProps extends Omit<AntButtonProps, "type" | "danger" | "variant"> {
  variant?: ButtonVariant;
}

export default function Button({ variant = "default", ...props }: ButtonProps) {
  return <AntButton type={TYPE_BY_VARIANT[variant]} danger={variant === "danger"} {...props} />;
}
