import { useEffect, useMemo, useState } from "react";
import { InputNumber, Pagination, TimePicker } from "antd";
import { MapPin, Plus, Minus, X } from "lucide-react";
import dayjs from "dayjs";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Input, { TextArea } from "../shared/components/Input";

const { RangePicker } = TimePicker;
const PAGE_SIZE = 5;

function toFormState(item) {
  return {
    locationIds: item?.locations?.map((loc) => loc.id) ?? [],
    name: item?.name ?? "",
    price: item?.price ?? null,
    timeRange:
      item?.start_time && item?.end_time
        ? [dayjs(item.start_time, "HH:mm:ss"), dayjs(item.end_time, "HH:mm:ss")]
        : null,
    note: item?.note ?? "",
  };
}

function LocationThumb({ location, size = "h-10 w-10" }) {
  return location.images?.[0] ? (
    <img
      src={location.images[0]}
      alt=""
      className={`${size} shrink-0 rounded-lg border border-stone-200 object-cover`}
    />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-400`}
    >
      <MapPin className="h-4 w-4" />
    </div>
  );
}

export default function ItemFormModal({ open, mode, item, locations, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toFormState(item));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(item));
      setSearch("");
      setPage(1);
      setError("");
    }
  }, [open, item]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredLocations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return locations;
    return locations.filter((loc) => loc.name.toLowerCase().includes(keyword));
  }, [locations, search]);

  const pagedLocations = filteredLocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedLocations = form.locationIds
    .map((id) => locations.find((loc) => loc.id === id))
    .filter(Boolean);

  function toggleLocation(id) {
    setForm((f) => ({
      ...f,
      locationIds: f.locationIds.includes(id)
        ? f.locationIds.filter((x) => x !== id)
        : [...f.locationIds, id],
    }));
  }

  function removeLocation(id) {
    setForm((f) => ({ ...f, locationIds: f.locationIds.filter((x) => x !== id) }));
  }

  function clearAllLocations() {
    setForm((f) => ({ ...f, locationIds: [] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.locationIds.length === 0) {
      setError("Cần chọn ít nhất 1 địa điểm.");
      return;
    }
    if (!form.name.trim()) {
      setError("Cần nhập tên hoạt động.");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      locationIds: form.locationIds,
      name: form.name,
      price: form.price,
      start_time: form.timeRange ? form.timeRange[0].format("HH:mm:ss") : null,
      end_time: form.timeRange ? form.timeRange[1].format("HH:mm:ss") : null,
      note: form.note,
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
      title={mode === "edit" ? "Sửa hoạt động" : "Thêm hoạt động mới"}
      footer={null}
      width={880}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left: picker */}
          <div className="rounded-lg border border-stone-200 p-3">
            <p className="mb-2 text-xs font-medium text-stone-500">Chọn địa điểm</p>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên địa điểm..."
              allowClear
            />
            <div className="mt-2 h-72 space-y-2 overflow-y-auto pr-1">
              {pagedLocations.length === 0 && (
                <p className="py-8 text-center text-xs text-stone-400">
                  Không tìm thấy địa điểm nào.
                </p>
              )}
              {pagedLocations.map((loc) => {
                const selected = form.locationIds.includes(loc.id);
                return (
                  <div
                    key={loc.id}
                    className={`flex items-center gap-2 rounded-lg border p-2 ${
                      selected ? "border-cyan-300 bg-cyan-50/50" : "border-stone-200"
                    }`}
                  >
                    <LocationThumb location={loc} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-stone-800">{loc.name}</p>
                      <p className="truncate font-mono text-xs text-stone-400">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleLocation(loc.id)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        selected
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                      }`}
                      aria-label={selected ? "Bỏ khỏi hoạt động" : "Thêm vào hoạt động"}
                    >
                      {selected ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
            {filteredLocations.length > PAGE_SIZE && (
              <div className="mt-2 flex justify-center">
                <Pagination
                  size="small"
                  current={page}
                  pageSize={PAGE_SIZE}
                  total={filteredLocations.length}
                  onChange={setPage}
                />
              </div>
            )}
          </div>

          {/* Right: selected */}
          <div className="rounded-lg border border-stone-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-stone-500">
                Đã chọn ({selectedLocations.length})
              </p>
              {selectedLocations.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllLocations}
                  className="text-xs text-stone-400 hover:text-red-600"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>
            <div className="h-72 space-y-2 overflow-y-auto pr-1">
              {selectedLocations.length === 0 && (
                <p className="py-8 text-center text-xs text-stone-400">
                  Chưa chọn địa điểm nào.
                </p>
              )}
              {selectedLocations.map((loc, idx) => (
                <div
                  key={loc.id}
                  className="flex items-center gap-2 rounded-lg border border-stone-200 p-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-medium text-stone-500">
                    {idx + 1}
                  </span>
                  <LocationThumb location={loc} size="h-8 w-8" />
                  <p className="min-w-0 flex-1 truncate text-sm text-stone-800">{loc.name}</p>
                  <button
                    type="button"
                    onClick={() => removeLocation(loc.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Bỏ chọn"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Tên hoạt động</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Ăn trưa, tham quan bảo tàng..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Khung giờ
            </label>
            <RangePicker
              className="w-full"
              format="HH:mm"
              value={form.timeRange}
              onChange={(timeRange) => setForm((f) => ({ ...f, timeRange }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Giá (đ)</label>
            <InputNumber
              className="w-full"
              min={0}
              value={form.price}
              onChange={(price) => setForm((f) => ({ ...f, price }))}
              placeholder="0"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(value) => value.replace(/\./g, "")}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Ghi chú</label>
          <TextArea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Ghi chú ngắn về hoạt động này"
            rows={2}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? "Lưu thay đổi" : "Thêm hoạt động"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
