import { useEffect, useState, type FormEvent } from "react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import ImageUrlInput from "../shared/components/ImageUrlInput";
import { useTranslation } from "../i18n/useAppTranslation";
import { isShortGoogleMapsLink, parseGoogleMapsUrl } from "../shared/utils/googleMapsLink";
import { resolveShortMapsLink } from "../services/mapsLink.service";
import type { LocationRow } from "../shared/types/models";
import type { LocationInput } from "../services/locations.service";

export interface LocationFormResult {
  error?: string;
}

interface LocationFormState {
  name: string;
  description: string;
  lat: string;
  lng: string;
  images: string[];
}

function toFormState(location: LocationRow | null | undefined): LocationFormState {
  return {
    name: location?.name ?? "",
    description: location?.description ?? "",
    lat: location ? String(location.lat) : "",
    lng: location ? String(location.lng) : "",
    images: location?.images ?? [],
  };
}

export interface LocationFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  location: LocationRow | null;
  onClose: () => void;
  onSubmit: (values: LocationInput) => Promise<LocationFormResult | void>;
}

export default function LocationFormModal({
  open,
  mode,
  location,
  onClose,
  onSubmit,
}: LocationFormModalProps) {
  const { t } = useTranslation(["common", "forms", "validation"]);
  const [form, setForm] = useState<LocationFormState>(() => toFormState(location));
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
        if (resolveError || !finalUrl) throw new Error(resolveError ?? "Could not resolve link.");
        fullUrl = finalUrl;
      }

      const parsed = parseGoogleMapsUrl(fullUrl);
      if (!parsed) throw new Error("Could not find coordinates in this link.");

      setForm((current) => ({
        ...current,
        lat: String(parsed.lat),
        lng: String(parsed.lng),
        name: current.name.trim() ? current.name : parsed.name || current.name,
      }));
    } catch (err) {
      setMapsLinkError(err instanceof Error ? err.message : "Could not process this link.");
    } finally {
      setConvertingLink(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);

    if (!form.name.trim()) {
      setError(t("validation:locationNameRequired"));
      return;
    }
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setError(t("validation:latitudeRange"));
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError(t("validation:longitudeRange"));
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      name: form.name.trim(),
      description: form.description,
      lat,
      lng,
      images: form.images,
    });
    setSubmitting(false);

    if (result?.error) setError(result.error);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? t("forms:location.editTitle") : t("forms:location.createTitle")}
      footer={null}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label={t("forms:location.fields.mapsLink")} hint={t("forms:location.hints.mapsLink")}>
          <div className="flex gap-2">
            <Input
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
            />
            <Button onClick={handleConvertMapsLink} loading={convertingLink}>
              Convert
            </Button>
          </div>
          {mapsLinkError && <p className="mt-1.5 text-xs text-danger">{mapsLinkError}</p>}
        </Field>

        <Field label={t("forms:location.fields.name")}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="..."
          />
        </Field>

        <Field
          label={t("forms:location.fields.description")}
          hint={t("forms:location.hints.description")}
        >
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="..."
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("forms:location.fields.lat")}>
            <Input
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              placeholder="10.7724"
            />
          </Field>
          <Field label={t("forms:location.fields.lng")}>
            <Input
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              placeholder="106.698"
            />
          </Field>
        </div>

        <Field label={t("forms:location.fields.images")} hint={t("forms:location.hints.images")}>
          <ImageUrlInput value={form.images} onChange={(images) => setForm({ ...form, images })} />
        </Field>

        {error && (
          <p className="rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-2.5 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>{t("common:actions.cancel")}</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? t("common:actions.saveChanges") : t("common:actions.add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
