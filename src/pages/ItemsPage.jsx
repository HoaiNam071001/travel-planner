import { useEffect, useState } from "react";
import { Sparkles, Plus } from "lucide-react";
import { listItems, createItem, updateItem, deleteItem } from "../services/items.service";
import { listLocations } from "../services/locations.service";
import Button from "../shared/components/Button";
import ItemCard from "../components/ItemCard";
import ItemFormModal from "../components/ItemFormModal";
import ItemDetailModal from "../components/ItemDetailModal";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formModal, setFormModal] = useState({ open: false, mode: "create", item: null });
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [itemsRes, locationsRes] = await Promise.all([listItems(), listLocations()]);

    if (itemsRes.error) {
      setError("Không tải được danh sách hoạt động: " + itemsRes.error.message);
    } else {
      setItems(itemsRes.data ?? []);
    }
    setLocations(locationsRes.data ?? []);
    setLoading(false);
  }

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", item: null });
  }

  function openEditModal(item) {
    setDetailItem(null);
    setFormModal({ open: true, mode: "edit", item });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, open: false }));
  }

  async function handleDelete(id) {
    const { error: deleteError } = await deleteItem(id);
    if (deleteError) {
      setError("Không xoá được hoạt động: " + deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (detailItem?.id === id) setDetailItem(null);
  }

  async function handleFormSubmit(values) {
    if (formModal.mode === "edit") {
      const { data, error: updateError } = await updateItem(formModal.item.id, values);
      if (updateError) return { error: "Không lưu được thay đổi: " + updateError.message };
      setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    } else {
      const { data, error: insertError } = await createItem(values);
      if (insertError) return { error: "Không thêm được hoạt động: " + insertError.message };
      setItems((prev) => [...prev, data]);
    }
    closeFormModal();
    return {};
  }

  return (
    <div className="min-h-full w-full bg-stone-50 font-sans text-stone-800">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-700 text-stone-50">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl text-cyan-900">Hoạt động</h1>
              <p className="text-sm text-stone-500">
                Việc cần làm, gắn với địa điểm + giá + khung giờ
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreateModal}
            disabled={locations.length === 0}
          >
            Thêm hoạt động
          </Button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        {!loading && locations.length === 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Chưa có địa điểm nào. Hãy thêm địa điểm ở trang Địa điểm trước khi tạo hoạt động.
          </p>
        )}

        <p className="mb-3 text-sm text-stone-500">{items.length} hoạt động đã lưu</p>

        {loading ? (
          <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-400">
            <p className="text-sm">Đang tải danh sách hoạt động...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-400">
            <Sparkles className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">Chưa có hoạt động nào. Thêm hoạt động đầu tiên nhé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onOpenDetail={setDetailItem}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <ItemFormModal
        open={formModal.open}
        mode={formModal.mode}
        item={formModal.item}
        locations={locations}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
      />

      <ItemDetailModal
        open={!!detailItem}
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={openEditModal}
      />
    </div>
  );
}
