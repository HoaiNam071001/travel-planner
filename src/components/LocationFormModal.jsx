import { useEffect, useState } from "react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Dán link Google Maps (tự điền tên + vị trí)
          </label>
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
          {mapsLinkError && (
            <p className="mt-1 text-xs text-red-600">{mapsLinkError}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Tên địa điểm
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Bảo tàng Chứng tích Chiến tranh"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Mô tả</label>
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ghi chú ngắn về địa điểm này"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Vĩ độ (lat)
            </label>
            <Input
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              placeholder="10.7724"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Kinh độ (lng)
            </label>
            <Input
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              placeholder="106.698"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Ảnh (thêm từ URL)
          </label>
          <ImageUrlInput
            value={form.images}
            onChange={(images) => setForm({ ...form, images })}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? "Lưu thay đổi" : "Thêm địa điểm"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
