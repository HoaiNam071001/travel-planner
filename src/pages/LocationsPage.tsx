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
import { useTranslation } from "../i18n/useAppTranslation";
import { formatDistance } from "../shared/utils/format";
import type { LatLng } from "../shared/utils/geo";
import type { Id, LocationRow } from "../shared/types/models";
import Button from "../shared/components/Button";
import EmptyState from "../shared/components/EmptyState";
import Input from "../shared/components/Input";
import PageHeader from "../shared/components/PageHeader";
import LocationCard from "../components/LocationCard";
import LocationsMap from "../components/LocationsMap";
import LocationFormModal from "../components/LocationFormModal";
import LocationDetailModal from "../components/LocationDetailModal";

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
  const { t } = useTranslation(["locations", "common"]);
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

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const requestRef = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    const { data, error: fetchError } = await listLocationsPage({ search: keyword, offset: 0 });
    if (requestId !== requestRef.current) return;

    if (fetchError) {
      setError(t("locations:errors.load", { message: fetchError.message }));
    } else if (data) {
      setError("");
      setRows(data.rows);
      setTotal(data.total);
      setHasMore(data.hasMore);
    }
    setLoading(false);
  }, [keyword, t]);

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
      setError(t("locations:errors.loadMore", { message: fetchError.message }));
    } else if (data) {
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...data.rows.filter((r) => !seen.has(r.id))];
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  }, [hasMore, keyword, loadingMore, rows.length, t]);

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
      setError(t("locations:errors.searchArea", { message: fetchError.message }));
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
      setError(t("locations:errors.delete", { message: deleteError.message }));
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
        return { error: t("locations:errors.save", { message: updateError?.message ?? "" }) };
      }
      replaceEverywhere(data);
    } else {
      const { data, error: insertError } = await createLocation(values);
      if (insertError || !data) {
        return { error: t("locations:errors.create", { message: insertError?.message ?? "" }) };
      }
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
        title={t("locations:title")}
        subtitle={t("locations:subtitle")}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            {t("locations:create")}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("locations:searchPlaceholder")}
            prefix={<Search className="h-3.5 w-3.5 text-text-muted" />}
            allowClear
            style={{ maxWidth: 320 }}
          />
          <span className="text-xs text-text-muted tnum">
            {area
              ? t("locations:counts.area", {
                  count: area.rows.length,
                  radius: formatDistance(area.radiusMeters),
                })
              : t("locations:counts.list", { visible: visible.length, total })}
          </span>
        </div>
      </PageHeader>

      {error && (
        <p className="mb-4 rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
          {error}
        </p>
      )}

      {area && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-primary/8 px-3.5 py-2.5 text-xs text-primary">
          <span className="tnum">
            {t("locations:areaFilter.label", {
              count: area.rows.length,
              lat: area.center.lat.toFixed(4),
              lng: area.center.lng.toFixed(4),
              radius: formatDistance(area.radiusMeters),
            })}
          </span>
          <button
            type="button"
            onClick={() => setArea(null)}
            className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <X className="h-3 w-3" />
            {t("locations:areaFilter.clear")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="surface-soft order-2 p-4 lg:order-1">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="surface h-24 animate-pulse" />
              ))}
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={MapPin}
              title={
                area
                  ? t("locations:empty.areaTitle")
                  : keyword
                    ? t("locations:empty.searchTitle")
                    : t("locations:empty.defaultTitle")
              }
              hint={
                area
                  ? t("locations:empty.areaHint")
                  : keyword
                    ? t("locations:empty.searchHint")
                    : t("locations:empty.defaultHint")
              }
              action={
                !area &&
                !keyword && (
                  <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
                    {t("locations:create")}
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
                <div ref={sentinelRef} className="py-2 text-center text-xs text-text-muted">
                  {loadingMore
                    ? t("locations:loadMore.loading")
                    : hasMore
                      ? t("locations:loadMore.more", { size: LOCATIONS_PAGE_SIZE })
                      : t("locations:loadMore.done")}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="surface-soft order-1 h-[46vh] overflow-hidden lg:order-2 lg:sticky lg:top-24 lg:h-[calc(100vh-9rem)]">
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
