import { useState } from "react";
import { Plus, X } from "lucide-react";
import Button from "./Button";
import Input from "./Input";

export default function ImageUrlInput({ value = [], onChange }) {
  const [url, setUrl] = useState("");

  function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setUrl("");
  }

  function handleRemove(idx) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPressEnter={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          placeholder="https://..."
        />
        <Button onClick={handleAdd} icon={<Plus className="h-4 w-4" />}>
          Thêm
        </Button>
      </div>

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {value.map((src, idx) => (
            <div
              key={`${src}-${idx}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-500 opacity-0 shadow transition group-hover:opacity-100 hover:text-red-600"
                aria-label="Xoá ảnh"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
