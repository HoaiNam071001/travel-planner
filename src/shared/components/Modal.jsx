import { Modal as AntModal } from "antd";

export default function Modal({ open, onClose, title, children, footer, width = 640, ...props }) {
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
