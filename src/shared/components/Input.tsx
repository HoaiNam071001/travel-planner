import { Input as AntInput } from "antd";

const inputClassName =
  "!rounded-xl !border-border/70 !bg-surface/90 !text-text-primary shadow-xs transition-all duration-200 placeholder:!text-text-muted hover:!border-border-hover focus-within:!border-primary/40 focus-within:!bg-surface-elevated";

export const TextArea = (props: React.ComponentProps<typeof AntInput.TextArea>) => (
  <AntInput.TextArea className={`${inputClassName} ${props.className ?? ""}`} {...props} />
);

export default function Input(props: React.ComponentProps<typeof AntInput>) {
  return <AntInput className={`${inputClassName} ${props.className ?? ""}`} {...props} />;
}
