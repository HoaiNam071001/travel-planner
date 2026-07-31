import { useCallback, useEffect, useRef, useState } from "react";
import { Compass, MapPin, Plus, Search, X } from "lucide-react";
import {
  LOCATIONS_PAGE_SIZE,
  createLocation,
  deleteLocation,
  listLocationsNear,
  listLocationsPage,
  updateLocation,
  type LocationInput,
} from "../services/locations.service";
import Button from "../shared/components/Button";
import EmptyState from "../shared/components/EmptyState";
import Input from "../shared/components/Input";
import PageHeader from "../shared/components/PageHeader";
import LocationCard from "../components/LocationCard";
import LocationsMap from "../components/LocationsMap";
import LocationFormModal from "../components/LocationFormModal";
import LocationDetailModal from "../components/LocationDetailModal";
import { formatDistance } from "../shared/utils/format";
import type { LatLng } from "../shared/utils/geo";
import type { Id, LocationRow } from "../shared/types/models";

/** Kết quả của nút "tìm địa điểm quanh đây" — thay thế danh sách phân trang. */
interface AreaFilter {
  center: LatLng;
  radiusMeters: number;
  rows: (LocationRow & { distance: number })[];
}

interface FormModalState {
  open: boolean;
  mode: "create" | "edit";
  location: LocationRow | null;
}

export default function LocationsPage() {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [area, setArea] = useState<AreaFilter | null>(null);
  const [searchingArea, setSearchingArea] = useState(false);
  const [focusId, setFocusId] = useState<Id | null>(null);

  const [formModal, setFormModal] = useState<FormModalState>({
    open: false,
    mode: "create",
    location: null,
  });
  const [detailLocation, setDetailLocation] = useState<LocationRow | null>(null);

  // Gõ tới đâu tìm tới đó, nhưng đợi 300ms cho đỡ gọi API mỗi ký tự.
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Mỗi lần đổi từ khoá là một "phiên" mới — phản hồi của phiên cũ về sau bị bỏ qua.
  const requestRef = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    const { data, error: fetchError } = await listLocationsPage({ search: keyword, offset: 0 });
    if (requestId !== requestRef.current) return;

    if (fetchError) {
      setError("Không tải được danh sách địa điểm: " + fetchError.message);
    } else if (data) {
      setError("");
      setRows(data.rows);
      setTotal(data.total);
      setHasMore(data.hasMore);
    }
    setLoading(false);
  }, [keyword]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const requestId = requestRef.current;
    setLoadingMore(true);
    const { data, error: fetchError } = await listLocationsPage({
      search: keyword,
      offset: rows.length,
    });
    if (requestId !== requestRef.current) return;

    if (fetchError) {
      setError("Không tải thêm được địa điểm: " + fetchError.message);
    } else if (data) {
      // Lọc trùng phòng khi có bản ghi mới chèn vào giữa 2 lần tải.
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...data.rows.filter((r) => !seen.has(r.id))];
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  }, [hasMore, keyword, loadingMore, rows.length]);

  // Infinite scroll: quan sát 1 ô "mồi" ở cuối danh sách.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || area || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "240px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [area, hasMore, loadMore]);

  async function handleSearchArea(center: LatLng, radiusMeters: number) {
    setSearchingArea(true);
    const { data, error: fetchError } = await listLocationsNear(center, radiusMeters);
    setSearchingArea(false);

    if (fetchError) {
      setError("Không tìm được địa điểm quanh đây: " + fetchError.message);
      return;
    }
    setError("");
    setArea({ center, radiusMeters, rows: data ?? [] });
  }

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", location: null });
  }

  function openEditModal(location: LocationRow) {
    setDetailLocation(null);
    setFormModal({ open: true, mode: "edit", location });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, open: false }));
  }

  function replaceEverywhere(updated: LocationRow) {
    setRows((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setArea((prev) =>
      prev
        ? {
            ...prev,
            rows: prev.rows.map((l) => (l.id === updated.id ? { ...updated, distance: l.distance } : l)),
          }
        : prev
    );
  }

  async function handleDelete(id: Id) {
    const { error: deleteError } = await deleteLocation(id);
    if (deleteError) {
      setError("Không xoá được địa điểm: " + deleteError.message);
      return;
    }
    setRows((prev) => prev.filter((l) => l.id !== id));
    setTotal((prev) => Math.max(prev - 1, 0));
    setArea((prev) => (prev ? { ...prev, rows: prev.rows.filter((l) => l.id !== id) } : prev));
    if (focusId === id) setFocusId(null);
    if (detailLocation?.id === id) setDetailLocation(null);
  }

  async function handleFormSubmit(values: LocationInput) {
    if (formModal.mode === "edit" && formModal.location) {
      const { data, error: updateError } = await updateLocation(formModal.location.id, values);
      if (updateError || !data) {
        return { error: "Không lưu được thay đổi: " + (updateError?.message ?? "") };
      }
      replaceEverywhere(data);
    } else {
      const { data, error: insertError } = await createLocation(values);
      if (insertError || !data) {
        return { error: "Không thêm được địa điểm: " + (insertError?.message ?? "") };
      }
      // Danh sách sắp theo created_at giảm dần nên bản ghi mới nằm đầu.
      setRows((prev) => [data, ...prev]);
      setTotal((prev) => prev + 1);
    }
    closeFormModal();
    return {};
  }

  const visible: LocationRow[] = area ? area.rows : rows;
  const distanceById = new Map(area?.rows.map((r) => [r.id, r.distance]) ?? []);
  const isEmpty = !loading && visible.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <PageHeader
        icon={Compass}
        title="Sổ tay địa điểm"
        subtitle="Lưu lại những nơi bạn muốn ghé qua — tìm theo tên hoặc quét quanh một điểm trên bản đồ"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Thêm địa điểm
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm địa điểm theo tên..."
            prefix={<Search className="h-3.5 w-3.5 text-slate-400" />}
            allowClear
            style={{ maxWidth: 320 }}
          />
          <span className="text-xs text-slate-400 tnum">
            {area
              ? `${area.rows.length} địa điểm trong bán kính ${formatDistance(area.radiusMeters)}`
              : `${visible.length}/${total} địa điểm`}
          </span>
        </div>
      </PageHeader>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}

      {area && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-3.5 py-2.5 text-xs text-brand-800">
          <span className="tnum">
            Đang lọc {area.rows.length} địa điểm quanh {area.center.lat.toFixed(4)},{" "}
            {area.center.lng.toFixed(4)} (bán kính {formatDistance(area.radiusMeters)}).
          </span>
          <button
            type="button"
            onClick={() => setArea(null)}
            className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <X className="h-3 w-3" />
            Bỏ lọc vùng
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* ------------------------------------------------------------ list */}
        <div className="order-2 lg:order-1">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/50" />
              ))}
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={MapPin}
              title={
                area
                  ? "Không có địa điểm nào quanh đây"
                  : keyword
                    ? "Không tìm thấy địa điểm nào khớp"
                    : "Chưa có địa điểm nào"
              }
              hint={
                area
                  ? `Thử kéo bản đồ tới khu vực khác rồi bấm "Tìm địa điểm ở đây" lần nữa.`
                  : keyword
                    ? "Thử từ khoá ngắn hơn, hoặc xoá ô tìm kiếm."
                    : "Dán link Google Maps vào modal thêm địa điểm để tự điền tên và toạ độ."
              }
              action={
                !area &&
                !keyword && (
                  <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
                    Thêm địa điểm
                  </Button>
                )
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((loc) => (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  isFocused={focusId === loc.id}
                  distance={distanceById.get(loc.id) ?? null}
                  onOpenDetail={setDetailLocation}
                  onEdit={openEditModal}
                  onFocusMap={setFocusId}
                  onDelete={handleDelete}
                />
              ))}

              {!area && (
                <div ref={sentinelRef} className="py-2 text-center text-xs text-slate-400">
                  {loadingMore
                    ? "Đang tải thêm..."
                    : hasMore
                      ? `Cuộn tiếp để xem thêm (mỗi lần ${LOCATIONS_PAGE_SIZE})`
                      : "Đã hết danh sách."}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- map */}
        <div className="order-1 h-[46vh] overflow-hidden rounded-2xl border border-slate-200 shadow-card lg:order-2 lg:sticky lg:top-24 lg:h-[calc(100vh-9rem)]">
          <LocationsMap
            locations={visible}
            focusId={focusId}
            area={area ? { center: area.center, radiusMeters: area.radiusMeters } : null}
            searching={searchingArea}
            onSelectLocation={setDetailLocation}
            onSearchArea={handleSearchArea}
          />
        </div>
      </div>

      <LocationFormModal
        open={formModal.open}
        mode={formModal.mode}
        location={formModal.location}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
      />

      <LocationDetailModal
        open={!!detailLocation}
        location={detailLocation}
        onClose={() => setDetailLocation(null)}
        onEdit={openEditModal}
        onFocusMap={setFocusId}
      />
    </div>
  );
}
