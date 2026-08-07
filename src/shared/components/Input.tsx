import { Input as AntInput } from "antd";

const inputClassName =
  "!rounded-2xl !border-border/70 !bg-surface/88 !text-text-primary shadow-[0_12px_30px_-26px_rgba(15,23,42,0.3)] transition-all duration-200 placeholder:!text-text-muted hover:!border-border-hover focus-within:!border-primary/40 focus-within:!bg-surface-elevated";

export const TextArea = (props: React.ComponentProps<typeof AntInput.TextArea>) => (
  <AntInput.TextArea className={`${inputClassName} ${props.className ?? ""}`} {...props} />
);

export default function Input(props: React.ComponentProps<typeof AntInput>) {
  return <AntInput className={`${inputClassName} ${props.className ?? ""}`} {...props} />;
}
