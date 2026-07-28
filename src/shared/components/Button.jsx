import { Button as AntButton } from "antd";

const TYPE_BY_VARIANT = {
  primary: "primary",
  default: "default",
  text: "text",
  danger: "primary",
};

export default function Button({ variant = "default", ...props }) {
  return (
    <AntButton type={TYPE_BY_VARIANT[variant]} danger={variant === "danger"} {...props} />
  );
}
