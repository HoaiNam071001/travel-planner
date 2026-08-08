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
      className={`relative hidden shrink-0 border-r border-border/60 bg-surface-elevated transition-[width] duration-300 xl:flex xl:flex-col ${
        collapsed ? "w-[104px]" : "w-[264px]"
      }`}
    >
      <div className="flex h-full flex-col px-4 py-4">
        <div className="gradient-brand relative overflow-hidden rounded-xl p-4 text-white shadow-card">
          <div className={`relative flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <img src="/logo.svg" alt="" className="h-10 w-10 rounded-lg bg-white/15 p-1.5" />
            <div className={collapsed ? "hidden" : ""}>
              <p className="font-display text-[0.95rem] font-bold">{t("common:appName")}</p>
              <p className="text-xs text-white/75">{t("common:shell.workspaceTagline")}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-1">
          <p className={`px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted/90 ${collapsed ? "text-center" : ""}`}>
            {t("common:shell.workspace")}
          </p>
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group relative flex items-center overflow-hidden rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-transparent text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                } ${collapsed ? "justify-center px-2" : "gap-3 px-4"}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span aria-hidden className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-primary" />
                  )}
                  <span
                    className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition ${
                      isActive
                        ? "text-primary"
                        : "text-text-muted group-hover:text-primary"
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

      </div>
    </aside>
  );
}
