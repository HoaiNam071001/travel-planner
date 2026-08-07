import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import Header from "../components/Header";

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.1),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24%)]"
      />
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(10,12,28,0.9),rgba(10,12,28,0))]" />
      <div className="relative flex min-h-screen">
        <AppSidebar collapsed={sidebarCollapsed} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          />
          <main className="flex-1 px-4 pb-8 pt-7 sm:px-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
