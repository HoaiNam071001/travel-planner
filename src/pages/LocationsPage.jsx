import { useEffect, useState } from "react";
import { MapPin, Plus, Compass } from "lucide-react";
import {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../services/locations.service";
import Button from "../shared/components/Button";
import LocationCard from "../components/LocationCard";
import LocationsMap from "../components/LocationsMap";
import LocationFormModal from "../components/LocationFormModal";
import LocationDetailModal from "../components/LocationDetailModal";

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewedIds, setViewedIds] = useState(() => new Set());
  const [formModal, setFormModal] = useState({ open: false, mode: "create", location: null });
  const [detailLocation, setDetailLocation] = useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    setLoading(true);
    const { data, error: fetchError } = await listLocations();

    if (fetchError) {
      setError("Không tải được danh sách địa điểm: " + fetchError.message);
    } else {
      setLocations(data ?? []);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", location: null });
  }

  function openEditModal(location) {
    setDetailLocation(null);
    setFormModal({ open: true, mode: "edit", location });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, open: false }));
  }

  function toggleMapView(id) {
    setViewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id) {
    const { error: deleteError } = await deleteLocation(id);
    if (deleteError) {
      setError("Không xoá được địa điểm: " + deleteError.message);
      return;
    }
    setLocations((prev) => prev.filter((l) => l.id !== id));
    setViewedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (detailLocation?.id === id) setDetailLocation(null);
  }

  async function handleFormSubmit(values) {
    if (formModal.mode === "edit") {
      const { data, error: updateError } = await updateLocation(formModal.location.id, values);
      if (updateError) return { error: "Không lưu được thay đổi: " + updateError.message };
      setLocations((prev) => prev.map((l) => (l.id === data.id ? data : l)));
    } else {
      const { data, error: insertError } = await createLocation(values);
      if (insertError) return { error: "Không thêm được địa điểm: " + insertError.message };
      setLocations((prev) => [...prev, data]);
    }
    closeFormModal();
    return {};
  }

  const mapLocations = locations.filter((l) => viewedIds.has(l.id));
  const isMapVisible = mapLocations.length > 0;

  return (
    <div className="min-h-full w-full bg-stone-50 font-sans text-stone-800">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-700 text-stone-50">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl text-cyan-900">Sổ tay địa điểm</h1>
              <p className="text-sm text-stone-500">Lưu lại những nơi bạn muốn ghé qua</p>
            </div>
          </div>

          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Thêm địa điểm
          </Button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div
          className={
            isMapVisible
              ? "grid grid-cols-1 gap-6 md:grid-cols-[1fr_420px]"
              : "grid grid-cols-1 gap-4"
          }
        >
          {/* List */}
          <div>
            <p className="mb-3 text-sm text-stone-500">{locations.length} địa điểm đã lưu</p>

            {loading ? (
              <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-400">
                <p className="text-sm">Đang tải danh sách địa điểm...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-400">
                <MapPin className="mx-auto mb-2 h-8 w-8" />
                <p className="text-sm">Chưa có địa điểm nào. Thêm địa điểm đầu tiên nhé.</p>
              </div>
            ) : (
              <div
                className={
                  isMapVisible
                    ? "flex flex-col gap-3"
                    : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {locations.map((loc) => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    isViewedOnMap={viewedIds.has(loc.id)}
                    onOpenDetail={setDetailLocation}
                    onEdit={openEditModal}
                    onToggleMap={toggleMapView}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Map panel */}
          {isMapVisible && (
            <div className="h-[70vh] overflow-hidden rounded-xl border border-stone-200 shadow-sm md:sticky md:top-6">
              <LocationsMap locations={mapLocations} />
            </div>
          )}
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
      />
    </div>
  );
}
