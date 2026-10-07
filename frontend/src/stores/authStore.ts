import { create } from "zustand";
import { persist } from "zustand/middleware";
import authService, { type User } from "../services/auth.service";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;

  // Actions
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setEmailVerified: (emailVerified: boolean) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      refreshToken: null,

      loginWithEmail: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const response = await authService.login(email, password);

          set({
            isAuthenticated: true,
            isLoading: false,
            user: {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name || response.email || "",
              avatar: response.user.avatar,
              isAdmin: response.user.isAdmin,
              role: response.user.isAdmin ? "admin" : "user",
              emailVerified: response.user.emailVerified,
            },
            token: response.accessToken,
            refreshToken: response.refreshToken,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      registerWithEmail: async (
        email: string,
        password: string,
        name: string
      ) => {
        set({ isLoading: true });

        try {
          const response = await authService.register(email, password, name);

          set({
            isAuthenticated: true,
            isLoading: false,
            user: {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name || name,
              avatar: response.user.avatar,
              isAdmin: response.user.isAdmin,
              role: response.user.isAdmin ? "admin" : "user",
              emailVerified: response.user.emailVerified,
            },
            token: response.accessToken,
            refreshToken: response.refreshToken,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithGoogle: async (credential: string) => {
        set({ isLoading: true });

        try {
          // Call backend to authenticate with Google
          const response = await authService.googleLogin(credential);

          set({
            isAuthenticated: true,
            isLoading: false,
            user: {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              avatar: response.user.avatar,
              isAdmin: response.user.isAdmin,
              role: response.user.isAdmin ? "admin" : "user",
              emailVerified: response.user.emailVerified,
            },
            token: response.accessToken,
            refreshToken: response.refreshToken,
          });
        } catch (error) {
          console.error("Failed to login with Google:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      setEmailVerified: (emailVerified: boolean) => {
        set((state) =>
          state.user ? { user: { ...state.user, emailVerified } } : {}
        );
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          // Even if backend logout fails, clear local state
          console.error("Logout API error:", error);
        }

        // Clear any legacy token keys from localStorage (security)
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("token");
        // Also clear admin verification storage
        localStorage.removeItem("admin-storage");

        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          token: null,
          refreshToken: null,
        });
      },

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ isLoading: loading }),

      clearAuth: () =>
        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          token: null,
          refreshToken: null,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
);

// Re-export User type for convenience
export type { User };
