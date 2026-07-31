import { useEffect, useState } from "react";
import { Popconfirm } from "antd";
import { Check, Copy, Link as LinkIcon, Trash2 } from "lucide-react";
import Modal from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import Field from "../../shared/components/Field";
import Input from "../../shared/components/Input";
import IconButton from "../../shared/components/IconButton";
import {
  listCollaborators,
  inviteCollaborator,
  removeCollaborator,
} from "../../services/collaborators.service";
import { planPreviewPath } from "../../shared/constants/routes";
import type { Id, Plan, PlanCollaborator } from "../../shared/types/models";

export interface ShareModalProps {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  /** Bật (token mới)/tắt (null) link xem trước — trang cha tự ghi qua `setPlanShareToken`. */
  onToggleShare: (token: string | null) => void;
}

export default function ShareModal({ open, plan, onClose, onToggleShare }: ShareModalProps) {
  const [collaborators, setCollaborators] = useState<PlanCollaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !plan) return;
    setLoading(true);
    setError("");
    setEmail("");
    void listCollaborators(plan.id).then(({ data, error: listError }) => {
      if (listError) setError(listError.message);
      setCollaborators(data ?? []);
      setLoading(false);
    });
  }, [open, plan]);

  async function handleInvite() {
    if (!plan || !email.trim()) return;
    setInviting(true);
    setError("");
    const { data, error: inviteError } = await inviteCollaborator(plan.id, email);
    setInviting(false);
    if (inviteError || !data) {
      setError(inviteError?.message ?? "Không mời được.");
      return;
    }
    setCollaborators((prev) => [...prev, data]);
    setEmail("");
  }

  async function handleRemove(id: Id) {
    const { error: removeError } = await removeCollaborator(id);
    if (removeError) {
      setError(removeError.message);
      return;
    }
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
  }

  const shareUrl = plan?.share_token
    ? `${window.location.origin}${planPreviewPath(plan.share_token)}`
    : null;

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chia sẻ kế hoạch"
      width={520}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      <div className="space-y-5 pt-1">
        <Field label="Mời cộng tác" hint="theo email tài khoản đã đăng nhập ứng dụng ít nhất 1 lần">
          <div className="flex gap-1.5">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onPressEnter={handleInvite}
              placeholder="email@vidu.com"
            />
            <Button variant="primary" loading={inviting} onClick={handleInvite}>
              Mời
            </Button>
          </div>

          {loading ? (
            <p className="mt-2.5 text-xs text-slate-400">Đang tải...</p>
          ) : collaborators.length > 0 ? (
            <ul className="mt-2.5 space-y-1.5">
              {collaborators.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <span className="truncate text-slate-700">{c.invited_email}</span>
                  <Popconfirm
                    title="Gỡ người này khỏi kế hoạch?"
                    okText="Gỡ"
                    cancelText="Huỷ"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleRemove(c.id)}
                  >
                    <IconButton size="sm" tone="danger" icon={Trash2} aria-label="Gỡ cộng tác viên" />
                  </Popconfirm>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 text-xs text-slate-400">
              Chưa mời ai — kế hoạch chỉ mình bạn xem/sửa được.
            </p>
          )}
        </Field>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </p>
        )}

        <Field label="Link xem trước công khai" hint="ai có link đều xem được, không cần đăng nhập">
          {shareUrl ? (
            <div className="flex gap-1.5">
              <Input readOnly value={shareUrl} className="font-mono text-xs" />
              <IconButton
                icon={copied ? Check : Copy}
                tone={copied ? "active" : "neutral"}
                onClick={() => void handleCopy()}
                aria-label="Sao chép link"
              />
              <Button variant="text" onClick={() => onToggleShare(null)}>
                Tắt
              </Button>
            </div>
          ) : (
            <Button
              icon={<LinkIcon className="h-4 w-4" />}
              onClick={() => onToggleShare(crypto.randomUUID())}
            >
              Bật link xem trước
            </Button>
          )}
        </Field>
      </div>
    </Modal>
  );
}
