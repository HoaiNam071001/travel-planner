import { NavLink } from "react-router-dom";
import { MapPin, Sparkles, CalendarDays, Map, Compass, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../shared/constants/routes";
import Button from "../shared/components/Button";

const NAV_ITEMS = [
  { to: ROUTES.LOCATIONS, label: "Địa điểm", icon: MapPin },
  { to: ROUTES.ITEMS, label: "Hoạt động", icon: Sparkles },
  { to: ROUTES.UNITS, label: "Đơn vị", icon: CalendarDays },
  { to: ROUTES.PLANS, label: "Kế hoạch", icon: Map },
];

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2 text-cyan-900">
          <Compass className="h-5 w-5" />
          <span className="font-serif text-lg">Travel Planner</span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-cyan-50 text-cyan-700"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user?.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.full_name ?? "avatar"}
              className="h-8 w-8 rounded-full"
            />
          )}
          <Button
            variant="text"
            shape="circle"
            onClick={() => signOut()}
            icon={<LogOut className="h-4 w-4" />}
            aria-label="Đăng xuất"
          />
        </div>
      </div>
    </header>
  );
}
