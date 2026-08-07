import { useEffect, useState } from "react";
import { Popconfirm } from "antd";
import { Check, Copy, Link as LinkIcon, Trash2 } from "lucide-react";
import Modal from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import Field from "../../shared/components/Field";
import Input from "../../shared/components/Input";
import IconButton from "../../shared/components/IconButton";
import { useTranslation } from "../../i18n/useAppTranslation";
import {
  inviteCollaborator,
  listCollaborators,
  removeCollaborator,
} from "../../services/collaborators.service";
import { planPreviewPath } from "../../shared/constants/routes";
import type { Id, Plan, PlanCollaborator } from "../../shared/types/models";

export interface ShareModalProps {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  onToggleShare: (token: string | null) => void;
}

export default function ShareModal({ open, plan, onClose, onToggleShare }: ShareModalProps) {
  const { t } = useTranslation("common");
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
      setError(inviteError?.message ?? "Không thể mời cộng tác viên.");
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
    setCollaborators((prev) => prev.filter((collaborator) => collaborator.id !== id));
  }

  const shareUrl = plan?.share_token ? `${window.location.origin}${planPreviewPath(plan.share_token)}` : null;

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
      footer={<Button onClick={onClose}>{t("actions.close")}</Button>}
    >
      <div className="space-y-5 pt-1">
        <Field label="Mời cộng tác viên">
          <div className="flex gap-1.5">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onPressEnter={handleInvite}
              placeholder="email@example.com"
            />
            <Button variant="primary" loading={inviting} onClick={handleInvite}>
              Mời
            </Button>
          </div>

          {loading ? (
            <p className="mt-2.5 text-xs text-text-muted">Đang tải...</p>
          ) : collaborators.length > 0 ? (
            <ul className="mt-2.5 space-y-1.5">
              {collaborators.map((collaborator) => (
                <li
                  key={collaborator.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface-elevated px-3 py-2 text-sm"
                >
                  <span className="truncate text-text-primary">{collaborator.invited_email}</span>
                  <Popconfirm
                    title="Gỡ cộng tác viên này?"
                    okText={t("actions.delete")}
                    cancelText={t("actions.cancel")}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleRemove(collaborator.id)}
                  >
                    <IconButton size="sm" tone="danger" aria-label="Gỡ cộng tác viên" icon={Trash2} />
                  </Popconfirm>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 text-xs text-text-muted">Chưa có cộng tác viên nào.</p>
          )}
        </Field>

        {error && <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs text-danger">{error}</p>}

        <Field label="Liên kết preview công khai">
          {shareUrl ? (
            <div className="flex gap-1.5">
              <Input readOnly value={shareUrl} className="font-mono text-xs" />
              <IconButton
                icon={copied ? Check : Copy}
                tone={copied ? "active" : "neutral"}
                onClick={() => void handleCopy()}
                aria-label="Sao chép liên kết"
              />
              <Button variant="text" onClick={() => onToggleShare(null)}>
                Tắt
              </Button>
            </div>
          ) : (
            <Button icon={<LinkIcon className="h-4 w-4" />} onClick={() => onToggleShare(crypto.randomUUID())}>
              Bật liên kết preview
            </Button>
          )}
        </Field>
      </div>
    </Modal>
  );
}
