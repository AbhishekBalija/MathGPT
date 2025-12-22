import { create } from "zustand";
import { persist } from "zustand/middleware";
import adminService, {
  type AdminStats,
  type AdminUser,
} from "../services/admin.service";

interface AdminState {
  // Passcode verification
  isAdminVerified: boolean;
  verificationAttempts: number;
  lockoutUntil: number | null;

  // Dashboard data
  stats: AdminStats | null;
  users: AdminUser[];
  usersTotal: number;
  usersPage: number;
  usersLimit: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  verifyPasscode: (passcode: string) => Promise<boolean>;
  clearAdminVerification: () => void;
  fetchStats: () => Promise<void>;
  fetchUsers: (page?: number, search?: string) => Promise<void>;
  updateUserRole: (userId: string, isAdmin: boolean) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isAdminVerified: false,
      verificationAttempts: 0,
      lockoutUntil: null,
      stats: null,
      users: [],
      usersTotal: 0,
      usersPage: 1,
      usersLimit: 20,
      isLoading: false,
      error: null,

      verifyPasscode: async (passcode: string) => {
        const state = get();

        // Check lockout
        if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
          const remaining = Math.ceil(
            (state.lockoutUntil - Date.now()) / 1000 / 60
          );
          set({
            error: `Too many attempts. Try again in ${remaining} minutes.`,
          });
          return false;
        }

        try {
          await adminService.verifyPasscode(passcode);
          set({
            isAdminVerified: true,
            verificationAttempts: 0,
            lockoutUntil: null,
            error: null,
          });
          return true;
        } catch {
          const attempts = state.verificationAttempts + 1;
          const isLocked = attempts >= MAX_ATTEMPTS;

          set({
            verificationAttempts: attempts,
            lockoutUntil: isLocked ? Date.now() + LOCKOUT_DURATION : null,
            error: isLocked
              ? "Too many failed attempts. Please wait 5 minutes."
              : "Invalid passcode",
          });
          return false;
        }
      },

      clearAdminVerification: () => {
        set({
          isAdminVerified: false,
          verificationAttempts: 0,
          lockoutUntil: null,
          stats: null,
          users: [],
          error: null,
        });
      },

      fetchStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const stats = await adminService.getStats();
          set({ stats, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Failed to load stats",
            isLoading: false,
          });
        }
      },

      fetchUsers: async (page = 1, search?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await adminService.getUsers(page, 20, search);
          set({
            users: response.users,
            usersTotal: response.total,
            usersPage: response.page,
            usersLimit: response.limit,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Failed to load users",
            isLoading: false,
          });
        }
      },

      updateUserRole: async (userId: string, isAdmin: boolean) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await adminService.updateUserRole(userId, isAdmin);
          set((state) => ({
            users: state.users.map((u) =>
              u.id === userId ? { ...u, isAdmin: user.isAdmin } : u
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Failed to update user role",
            isLoading: false,
          });
        }
      },

      deleteUser: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.deleteUser(userId);
          set((state) => ({
            users: state.users.filter((u) => u.id !== userId),
            usersTotal: state.usersTotal - 1,
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Failed to delete user",
            isLoading: false,
          });
        }
      },
    }),
    {
      name: "admin-storage",
      partialize: (state) => ({
        isAdminVerified: state.isAdminVerified,
        lockoutUntil: state.lockoutUntil,
        verificationAttempts: state.verificationAttempts,
      }),
    }
  )
);

export default useAdminStore;
