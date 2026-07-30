import { useEffect, useState } from "react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import ImageUrlInput from "../shared/components/ImageUrlInput";
import { isShortGoogleMapsLink, parseGoogleMapsUrl } from "../shared/utils/googleMapsLink";
import { resolveShortMapsLink } from "../services/mapsLink.service";

function toFormState(location) {
  return {
    name: location?.name ?? "",
    description: location?.description ?? "",
    lat: location ? String(location.lat) : "",
    lng: location ? String(location.lng) : "",
    images: location?.images ?? [],
  };
}

export default function LocationFormModal({ open, mode, location, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toFormState(location));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mapsLink, setMapsLink] = useState("");
  const [mapsLinkError, setMapsLinkError] = useState("");
  const [convertingLink, setConvertingLink] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(location));
      setError("");
      setMapsLink("");
      setMapsLinkError("");
    }
  }, [open, location]);

  async function handleConvertMapsLink() {
    const raw = mapsLink.trim();
    if (!raw) return;

    setMapsLinkError("");
    setConvertingLink(true);
    try {
      let fullUrl = raw;
      if (isShortGoogleMapsLink(raw)) {
        const { finalUrl, error: resolveError } = await resolveShortMapsLink(raw);
        if (resolveError) throw new Error(resolveError);
        fullUrl = finalUrl;
      }

      const parsed = parseGoogleMapsUrl(fullUrl);
      if (!parsed) {
        throw new Error("Không tìm thấy toạ độ trong link này.");
      }

      setForm((f) => ({
        ...f,
        lat: String(parsed.lat),
        lng: String(parsed.lng),
        name: f.name.trim() ? f.name : parsed.name || f.name,
      }));
    } catch (err) {
      setMapsLinkError(err.message || "Không xử lý được link này.");
    } finally {
      setConvertingLink(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);

    if (!form.name.trim()) {
      setError("Cần nhập tên địa điểm.");
      return;
    }
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setError("Vĩ độ (lat) phải là số từ -90 đến 90.");
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError("Kinh độ (lng) phải là số từ -180 đến 180.");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      name: form.name,
      description: form.description,
      lat,
      lng,
      images: form.images,
    });
    setSubmitting(false);

    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Sửa địa điểm" : "Thêm địa điểm mới"}
      footer={null}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label="Link Google Maps" hint="tự điền tên + toạ độ">
          <div className="flex gap-2">
            <Input
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="https://maps.app.goo.gl/... hoặc https://www.google.com/maps/place/..."
            />
            <Button onClick={handleConvertMapsLink} loading={convertingLink}>
              Chuyển đổi
            </Button>
          </div>
          {mapsLinkError && <p className="mt-1.5 text-xs text-rose-600">{mapsLinkError}</p>}
        </Field>

        <Field label="Tên địa điểm">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Bảo tàng Chứng tích Chiến tranh"
          />
        </Field>

        <Field label="Mô tả" hint="không bắt buộc">
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ghi chú ngắn về địa điểm này"
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Vĩ độ (lat)">
            <Input
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              placeholder="10.7724"
            />
          </Field>
          <Field label="Kinh độ (lng)">
            <Input
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              placeholder="106.698"
            />
          </Field>
        </div>

        <Field label="Ảnh" hint="thêm từ URL">
          <ImageUrlInput value={form.images} onChange={(images) => setForm({ ...form, images })} />
        </Field>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? "Lưu thay đổi" : "Thêm địa điểm"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
