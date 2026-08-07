import { Dropdown, type MenuProps } from "antd";
import { Home, LogOut, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/useAppTranslation";
import { ROUTES } from "../shared/constants/routes";
import ThemeSwitcher from "../shared/components/ThemeSwitcher";
import LanguageSwitcher from "../shared/components/LanguageSwitcher";

export default function Header({
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "navigation"]);
  const { user, signOut } = useAuth();
  const metadata = user?.user_metadata as { full_name?: string; avatar_url?: string } | undefined;
  const name = metadata?.full_name ?? user?.email ?? t("common:userFallback");
  const avatar = metadata?.avatar_url;

  const menuItems: MenuProps["items"] = [
    {
      key: "user",
      disabled: true,
      label: (
        <div className="min-w-[190px] py-1">
          <p className="truncate text-sm font-medium text-text-primary">{name}</p>
          <p className="truncate text-xs text-text-muted">{user?.email}</p>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "signout",
      danger: true,
      icon: <LogOut className="h-4 w-4" />,
      label: t("common:actions.signOut"),
      onClick: () => void signOut(),
    },
  ];

  return (
    <header className="sticky top-0 z-40">
      <div className="relative px-4 pt-4 sm:px-6 xl:px-8">
        <div className="flex h-[72px] items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface-elevated/92 px-4 shadow-xs backdrop-blur-md sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden rounded-xl p-2.5 text-text-muted transition hover:bg-surface-secondary hover:text-text-primary xl:inline-flex"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.HOME)}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
            >
              <Home className="h-4 w-4 text-primary" />
              <span className="hidden sm:block">{t("common:actions.goHome")}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />

            <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: menuItems }}>
              <button
                type="button"
                className="group inline-flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-surface-secondary"
                aria-label={t("navigation:account")}
              >
                {avatar ? (
                  <img src={avatar} alt={name} className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(236,72,153,0.92),rgba(190,24,93,0.86))] text-white shadow-xs">
                    <User className="h-4 w-4" />
                  </span>
                )}
                <span className="hidden min-w-0 text-left md:block">
                  <span className="block max-w-[160px] truncate text-sm font-medium text-text-primary">{name}</span>
                  <span className="block max-w-[180px] truncate text-xs text-text-muted">{user?.email}</span>
                </span>
              </button>
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
}
