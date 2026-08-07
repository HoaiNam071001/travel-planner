import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import Button from "./Button";
import Input from "./Input";

export interface ImageUrlInputProps {
  value?: string[];
  onChange: (images: string[]) => void;
}

export default function ImageUrlInput({ value = [], onChange }: ImageUrlInputProps) {
  const [url, setUrl] = useState("");

  function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setUrl("");
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPressEnter={(e: KeyboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            handleAdd();
          }}
          placeholder="https://..."
        />
        <Button onClick={handleAdd} icon={<Plus className="h-4 w-4" />}>
          Them
        </Button>
      </div>

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {value.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border/10 bg-surface-secondary/76"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute right-1 top-1 rounded-full bg-surface-elevated/92 p-1 text-text-muted opacity-0 shadow transition group-hover:opacity-100 hover:text-danger"
                aria-label="Xoa anh"
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
