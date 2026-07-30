import { useState } from "react";
import { Popconfirm } from "antd";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import IconButton from "../shared/components/IconButton";
import Input from "../shared/components/Input";

export default function ManageUnitTypesModal({ open, types, onClose, onCreate, onDelete }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    await onCreate(name);
    setNewName("");
    setCreating(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Quản lý loại chặng" footer={null} width={420}>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Thêm loại mới (VD: Ngày, Tuần...)"
          onPressEnter={handleCreate}
        />
        <Button
          variant="primary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={handleCreate}
          loading={creating}
        >
          Thêm
        </Button>
      </div>

      <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {types.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">Chưa có loại nào.</p>
        ) : (
          types.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
            >
              <span className="text-sm text-slate-700">{t.name}</span>
              <Popconfirm
                title="Xoá loại này?"
                okText="Xoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(t.id)}
              >
                <IconButton size="sm" tone="danger" icon={Trash2} aria-label="Xoá" />
              </Popconfirm>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onClose}>Đóng</Button>
      </div>
    </Modal>
  );
}
