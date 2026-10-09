import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Plus, Search, Sun, Trash2, X } from "lucide-react";
import Logo from "../../../components/brand/Logo";
import { useAuthStore } from "../../../stores/authStore";
import { useChatStore } from "../../../stores/chatStore";
import { useThemeStore } from "../../../stores/themeStore";
import { groupByDate } from "./groupByDate";

export interface HistoryEntry {
  id: string;
  problem: string;
  createdAt: string; // ISO date string
}

interface HistorySidebarProps {
  entries: HistoryEntry[];
  activeId: string | null;
  loading: boolean;
  // Phone only: whether the drawer is open. On desktop the sidebar is always there.
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const ICON_BUTTON =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-900 hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-white/10";

export function HistorySidebar({
  entries,
  activeId,
  loading,
  open,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onClearAll,
}: HistorySidebarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toggleProfileModal = useChatStore((state) => state.toggleProfileModal);
  const { isDark, initTheme, toggleTheme } = useThemeStore();

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  // Set the light or dark class once when the page opens.
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const groups = useMemo(() => {
    const text = query.trim().toLowerCase();
    const shown = text ? entries.filter((entry) => entry.problem.toLowerCase().includes(text)) : entries;
    return groupByDate(shown, new Date());
  }, [entries, query]);

  function toggleSearch() {
    setSearching((on) => !on);
    setQuery("");
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close history"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 sm:hidden"
        />
      ) : null}
      <aside
        aria-label="History"
        className={`fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-80 flex-col border-r border-gray-200 bg-white transition-[transform,visibility] duration-200 dark:border-white/10 dark:bg-[#120d12] sm:static sm:z-auto sm:w-65 sm:max-w-none sm:shrink-0 sm:visible sm:translate-x-0 ${
          // A closed drawer is also invisible, so its buttons leave the tab order on phones
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-1 px-3 pt-3">
          <div className="pl-1">
            <Logo height="20px" />
          </div>
          <div className="flex">
            <button
              type="button"
              onClick={toggleSearch}
              aria-label="Search problems"
              aria-pressed={searching}
              className={ICON_BUTTON}
            >
              <Search className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={onNew} aria-label="New problem" className={ICON_BUTTON}>
              <Plus className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={onClose} aria-label="Close history" className={`${ICON_BUTTON} sm:hidden`}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {searching ? (
          <div className="px-3 pt-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your problems"
              aria-label="Search your problems"
              autoFocus
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-50 dark:placeholder:text-gray-400 dark:focus:ring-brand-300"
            />
          </div>
        ) : null}

        <nav aria-label="Saved problems" className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
          {loading && entries.length === 0 ? (
            <p className="px-3 py-6 text-sm text-gray-600 dark:text-gray-400">Loading your problems…</p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-6 text-sm text-gray-600 dark:text-gray-400">
              {query.trim() ? "No problems match that." : "Problems you solve show up here."}
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.label} className="mt-3">
                <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  {group.label}
                </h3>
                <ul className="mt-1">
                  {group.items.map((entry) => (
                    <li key={entry.id} className="group flex items-center">
                      <button
                        type="button"
                        onClick={() => onSelect(entry.id)}
                        aria-current={entry.id === activeId ? "true" : undefined}
                        className={`min-h-11 min-w-0 flex-1 truncate rounded-xl px-3 text-left text-sm ${
                          entry.id === activeId
                            ? "bg-gray-100 font-semibold text-gray-900 dark:bg-white/10 dark:text-gray-50"
                            : "text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        {entry.problem}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        aria-label={`Delete ${entry.problem}`}
                        className={`${ICON_BUTTON} shrink-0 text-gray-600 dark:text-gray-400`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="mt-4 min-h-11 px-3 text-sm text-gray-600 underline-offset-4 hover:underline dark:text-gray-400"
            >
              Clear all history
            </button>
          ) : null}
        </nav>

        <div className="flex items-center gap-1 border-t border-gray-200 p-2 dark:border-white/10">
          <button
            type="button"
            onClick={toggleProfileModal}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-900 dark:bg-gray-700 dark:text-gray-50"
            >
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </span>
            <span className="min-w-0 truncate text-sm text-gray-900 dark:text-gray-50">
              {user?.email?.split("@")[0] ?? "Your profile"}
            </span>
          </button>
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
      </aside>
    </>
  );
}
