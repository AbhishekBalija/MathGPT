import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  initTheme: () => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  initTheme: () => {
    // Only run on client
    if (typeof window === "undefined") return;

    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const shouldBeDark =
      savedTheme === "dark" || (!savedTheme && systemPrefersDark);

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      set({ isDark: true });
    } else {
      document.documentElement.classList.remove("dark");
      set({ isDark: false });
    }
  },

  toggleTheme: () => {
    const { isDark } = get();
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      set({ isDark: false });
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      set({ isDark: true });
    }
  },
}));
