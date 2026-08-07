import { NavLink } from "react-router-dom";
import { Map, MapPin, Sparkles, Route as RouteIcon, type LucideIcon } from "lucide-react";
import { useTranslation } from "../i18n/useAppTranslation";
import { ROUTES } from "../shared/constants/routes";

interface NavItem {
  to: string;
  labelKey: "plans" | "units" | "items" | "locations";
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.PLANS, labelKey: "plans", icon: Map },
  { to: ROUTES.UNITS, labelKey: "units", icon: RouteIcon },
  { to: ROUTES.ITEMS, labelKey: "items", icon: Sparkles },
  { to: ROUTES.LOCATIONS, labelKey: "locations", icon: MapPin },
];

export default function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation(["common", "navigation"]);

  return (
    <aside
      className={`relative hidden shrink-0 transition-[width] duration-300 xl:flex xl:flex-col ${
        collapsed ? "w-[112px]" : "w-[308px]"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.01),rgba(255,255,255,0))]" />
      <div className="relative flex h-full flex-col px-5 py-5">
        <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,rgba(99,102,241,0.88),rgba(37,99,235,0.92),rgba(14,165,233,0.86))] p-5 text-white shadow-[0_34px_80px_-38px_rgba(37,99,235,0.85)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_46%)]" />
          <div className="absolute inset-y-0 right-0 w-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] blur-2xl" />
          <div className={`relative flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <img src="/logo.svg" alt="" className="h-12 w-12 rounded-[20px] bg-white/14 p-1.5" />
            <div className={collapsed ? "hidden" : ""}>
              <p className="font-display text-[1.05rem] font-bold">{t("common:appName")}</p>
              <p className="text-sm text-white/74">{t("common:shell.workspaceTagline")}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          <p className={`px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted/90 ${collapsed ? "text-center" : ""}`}>
            {t("common:shell.workspace")}
          </p>
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group relative flex items-center overflow-hidden rounded-[24px] py-3.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(59,130,246,0.28),rgba(79,70,229,0.24),rgba(14,165,233,0.18))] text-white shadow-[0_22px_52px_-38px_rgba(37,99,235,0.56)]"
                    : "bg-transparent text-text-secondary hover:bg-surface-elevated/68 hover:text-text-primary"
                } ${collapsed ? "justify-center px-2" : "gap-3 px-4"}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(147,197,253,0.7))]"
                    />
                  )}
                  <span
                    className={`relative flex h-11 w-11 items-center justify-center rounded-[20px] transition ${
                      isActive
                        ? "bg-white/12 text-white"
                        : "bg-surface-elevated/34 text-text-muted group-hover:bg-surface-elevated/64 group-hover:text-primary"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  {!collapsed && <span className="min-w-0 flex-1 truncate text-[1rem]">{t(`navigation:${labelKey}`)}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {!collapsed && (
          <div className="mt-auto overflow-hidden rounded-[28px] bg-surface-elevated/72 p-5 backdrop-blur-2xl shadow-[0_18px_42px_-34px_rgba(2,6,23,0.46)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{t("common:shell.designSystem")}</p>
            <p className="mt-3 text-[15px] leading-7 text-text-secondary">
              {t("common:shell.designSystemHint")}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
