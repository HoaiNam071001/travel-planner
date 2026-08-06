import { NavLink, useNavigate } from "react-router-dom";
import { Dropdown, type MenuProps } from "antd";
import {
  Home,
  MapPin,
  Sparkles,
  Route as RouteIcon,
  Map,
  LogOut,
  User,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../shared/constants/routes";
import IconButton from "../shared/components/IconButton";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.PLANS, label: "Kế hoạch", icon: Map },
  { to: ROUTES.UNITS, label: "Chặng", icon: RouteIcon },
  { to: ROUTES.ITEMS, label: "Hoạt động", icon: Sparkles },
  { to: ROUTES.LOCATIONS, label: "Địa điểm", icon: MapPin },
];

export default function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const metadata = user?.user_metadata as { full_name?: string; avatar_url?: string } | undefined;
  const name = metadata?.full_name ?? user?.email ?? "Bạn";
  const avatar = metadata?.avatar_url;

  const menuItems: MenuProps["items"] = [
    {
      key: "user",
      disabled: true,
      label: (
        <div className="min-w-[170px] py-1">
          <p className="truncate text-sm font-medium text-slate-800">{name}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "signout",
      danger: true,
      icon: <LogOut className="h-4 w-4" />,
      label: "Đăng xuất",
      onClick: () => void signOut(),
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <NavLink to={ROUTES.PLANS} className="flex shrink-0 items-center gap-2.5">
          <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0" />
          <span className="hidden font-display text-[15px] font-bold tracking-tight text-slate-900 lg:block">
            Travel Planner
          </span>
        </NavLink>

        <IconButton
          icon={Home}
          aria-label="Về trang chủ"
          onClick={() => navigate(ROUTES.HOME)}
          className="border border-slate-200/80"
        />

        {/* Nav dạng segmented pill — nền slate-100 để tách khỏi header trắng. */}
        <nav className="mx-auto flex items-center gap-0.5 rounded-xl bg-slate-100/80 p-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition sm:px-3 ${
                  isActive ? "bg-white text-brand-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:block">{label}</span>
            </NavLink>
          ))}
        </nav>

        <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: menuItems }}>
          <button
            type="button"
            className="shrink-0 rounded-full ring-2 ring-transparent transition hover:ring-brand-200"
            aria-label="Tài khoản"
          >
            {avatar ? (
              <img src={avatar} alt={name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <User className="h-4 w-4" />
              </span>
            )}
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
