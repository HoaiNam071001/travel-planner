import type { ReactNode } from "react";
import { Modal as AntModal, type ModalProps as AntModalProps } from "antd";

export interface ModalProps extends Omit<AntModalProps, "onCancel" | "footer" | "title"> {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 640,
  ...props
}: ModalProps) {
  return (
    <AntModal
      open={open}
      onCancel={onClose}
      title={title}
      footer={footer}
      width={width}
      destroyOnHidden
      {...props}
    >
      {children}
    </AntModal>
  );
}
