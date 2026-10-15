import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";
import Logo from "../../components/brand/Logo";
import adminService, { type AdminCounts } from "../../services/admin.service";
import { useAdminStore } from "../../stores/adminStore";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";

type CountKey = keyof AdminCounts;

interface NavItem {
  to: string;
  label: string;
  count?: CountKey;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  // On phones the nav is one row across the top, with "Handle" first
  phoneFirst?: boolean;
}

const GROUPS: NavGroup[] = [
  {
    label: "Watch",
    items: [
      { to: "/admin", label: "Overview" },
      { to: "/admin/health", label: "Health" },
      { to: "/admin/events", label: "Events" },
    ],
  },
  {
    label: "Handle",
    phoneFirst: true,
    items: [
      { to: "/admin/failed", label: "Failed solves", count: "failedOpen" },
      { to: "/admin/reports", label: "Reports", count: "reportsBlocked" },
      { to: "/admin/feedback", label: "Feedback", count: "feedbackOpen" },
    ],
  },
  {
    label: "People",
    items: [{ to: "/admin/students", label: "Students" }],
  },
];

const LINK =
  "flex min-h-11 shrink-0 items-center justify-between gap-2 px-3 text-sm text-gray-600 hover:text-gray-900 dark:text-[#8b93a1] dark:hover:text-gray-50 md:min-h-9 md:border-l md:-ml-px";
const ACTIVE = "font-semibold text-gray-900 dark:text-gray-50 border-b-2 border-brand-600 md:border-b-0 md:border-l-brand-600 dark:border-brand-300";
const IDLE = "border-b-2 border-transparent md:border-b-0 md:border-l-transparent";
const ICON_BUTTON =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 dark:text-[#8b93a1] dark:hover:bg-white/10";

// The admin's left nav on laptops, and a row across the top on phones.
export default function AdminNav() {
  const { pathname } = useLocation();
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const { user, logout } = useAuthStore();
  const { clearAdminData } = useAdminStore();
  const { isDark, toggleTheme } = useThemeStore();

  // Fresh counts on every page change, so a resolved item drops off straight away
  useEffect(() => {
    let current = true;
    adminService
      .getCounts()
      .then((next) => current && setCounts(next))
      .catch(() => current && setCounts(null));
    return () => {
      current = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    clearAdminData();
    await logout();
  };

  return (
    <nav
      aria-label="Admin"
      className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 dark:border-white/10 dark:bg-[#120d12] md:sticky md:top-0 md:h-screen md:flex-col md:items-stretch md:gap-0 md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-4"
    >
      <Link to="/admin" className="order-first flex min-h-11 shrink-0 items-center gap-2 px-1 md:order-none md:mb-4" aria-label="NeoMath admin">
        <Logo height="20px" />
        <span className="rounded-md border border-gray-200 px-1.5 text-xs font-semibold text-gray-600 dark:border-white/10 dark:text-[#8b93a1]">
          Admin
        </span>
      </Link>

      {GROUPS.map((group) => (
        <div key={group.label} className={`flex shrink-0 md:mt-3 md:block ${group.phoneFirst ? "order-first md:order-none" : ""}`}>
          <p className="hidden px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-[#8b93a1] md:block">
            {group.label}
          </p>
          <div className="flex md:ml-3 md:block md:border-l md:border-gray-200 md:dark:border-white/10">
            {group.items.map((item) => {
              const count = item.count && counts ? counts[item.count] : null;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  className={({ isActive }) => `${LINK} ${isActive ? ACTIVE : IDLE}`}
                >
                  <span>{item.label}</span>
                  {count !== null && count !== undefined ? (
                    <span
                      className={`rounded-md px-1.5 text-xs font-semibold ${
                        item.count === "failedOpen" && count > 0
                          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                          : "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-gray-50"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}

      <div className="ml-auto flex shrink-0 items-center md:mt-auto md:ml-0 md:flex-col md:items-stretch md:gap-1 md:border-t md:border-gray-200 md:pt-3 md:dark:border-white/10">
        <p className="hidden truncate px-2 text-sm text-gray-900 dark:text-gray-50 md:block">{user?.name}</p>
        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={ICON_BUTTON}
          >
            {isDark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
          </button>
          <button type="button" onClick={handleLogout} aria-label="Log out" className={ICON_BUTTON}>
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </div>
        <Link to="/app" className="hidden min-h-11 items-center px-2 text-sm text-gray-600 hover:underline dark:text-[#8b93a1] md:flex">
          ← Back to the app
        </Link>
      </div>
    </nav>
  );
}
