import { Outlet } from "react-router-dom";
import Header from "../components/Header";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Vệt sáng brand rất mờ ở đỉnh trang, cho nền đỡ phẳng. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-100/50 via-brand-50/20 to-transparent"
      />
      <div className="relative">
        <Header />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
