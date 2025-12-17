import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: "user" | "admin";
}

interface GoogleCredentialPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;

  // Actions
  login: (user: User, token: string) => void;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,

      login: (user, token) =>
        set({
          isAuthenticated: true,
          isLoading: false,
          user,
          token,
        }),

      loginWithGoogle: async (credential: string) => {
        set({ isLoading: true });

        try {
          // Decode the Google JWT to extract user info
          const decoded = jwtDecode<GoogleCredentialPayload>(credential);

          // For MVP: Create user directly from Google credential
          // In production: Send credential to backend for verification
          const user: User = {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
            role: "user", // Default role
          };

          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            token: credential,
          });

          // TODO: In production, call backend API:
          // const response = await api.post('/auth/google', { credential });
          // set({ user: response.data.user, token: response.data.token });
        } catch (error) {
          console.error("Failed to login with Google:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () =>
        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          token: null,
        }),

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "auth-storage",
    }
  )
);
