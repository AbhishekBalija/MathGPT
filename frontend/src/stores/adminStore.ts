import { create } from "zustand";
import adminService, {
  type AdminStats,
  type AdminUser,
} from "../services/admin.service";

// Admins sign in normally; there is no separate admin passcode (#20)
interface AdminState {
  // Dashboard data
  stats: AdminStats | null;
  users: AdminUser[];
  usersTotal: number;
  usersPage: number;
  usersLimit: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  clearAdminData: () => void;
  fetchStats: () => Promise<void>;
  fetchUsers: (page?: number, search?: string) => Promise<void>;
  updateUserRole: (userId: string, isAdmin: boolean) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>()(
  (set) => ({
    stats: null,
    users: [],
    usersTotal: 0,
    usersPage: 1,
    usersLimit: 20,
    isLoading: false,
    error: null,

    // Forget loaded dashboard data, e.g. on logout
    clearAdminData: () => {
      set({
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
  })
);

export default useAdminStore;
