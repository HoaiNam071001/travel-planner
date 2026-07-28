import { Hammer } from "lucide-react";

export default function ComingSoonPage({ title }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center text-stone-400">
      <Hammer className="mb-3 h-8 w-8" />
      <h1 className="font-serif text-xl text-stone-600">{title}</h1>
      <p className="mt-1 text-sm">Đang phát triển, quay lại sau nhé.</p>
    </div>
  );
}
