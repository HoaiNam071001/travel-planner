import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import Header from "../components/Header";

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgb(var(--color-primary)/0.05),transparent_26%),radial-gradient(circle_at_bottom_left,rgb(var(--color-info)/0.04),transparent_24%)]"
      />
      <div className="relative flex min-h-screen">
        <AppSidebar collapsed={sidebarCollapsed} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          />
          <main className="flex-1 px-4 pb-6 pt-5 sm:px-6 xl:px-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
