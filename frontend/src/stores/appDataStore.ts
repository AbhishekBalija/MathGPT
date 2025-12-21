import { create } from "zustand";
import {
  getUserProfile,
  type ProfileResponse,
} from "../services/profile.service";
import {
  getUserHistory,
  getSolutionById,
  type FullSolution,
} from "../services/history.service";

export interface HistoryItem {
  id: string;
  chatId?: string;
  problem: string;
  problemType: string;
  finalAnswer: string;
  summary: string;
  stepsCount: number;
  createdAt: string;
}

interface AppDataState {
  // Profile data
  profile: ProfileResponse | null;
  profileLoading: boolean;
  profileError: string | null;

  // History data
  history: HistoryItem[];
  historyLoading: boolean;
  historyError: string | null;

  // Solutions cache - Only cache solutions AFTER they're fetched on-demand
  solutionsCache: Map<string, FullSolution>;

  // Sync state
  isInitialized: boolean;
  lastSyncAt: Date | null;

  // Actions
  initializeData: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  clearData: () => void;

  // Solution cache actions
  getCachedSolution: (solutionId: string) => FullSolution | null;
  fetchAndCacheSolution: (solutionId: string) => Promise<FullSolution | null>;
}

export const useAppDataStore = create<AppDataState>((set, get) => ({
  // Initial state
  profile: null,
  profileLoading: false,
  profileError: null,

  history: [],
  historyLoading: false,
  historyError: null,

  solutionsCache: new Map(),

  isInitialized: false,
  lastSyncAt: null,

  // Get cached solution (instant)
  getCachedSolution: (solutionId) => {
    return get().solutionsCache.get(solutionId) || null;
  },

  // Fetch and cache a single solution (on-demand only)
  fetchAndCacheSolution: async (solutionId) => {
    // Check cache first
    const cached = get().solutionsCache.get(solutionId);
    if (cached) return cached;

    try {
      const solution = await getSolutionById(solutionId);
      if (solution) {
        // Cache the solution for future use
        set((state) => {
          const newCache = new Map(state.solutionsCache);
          newCache.set(solutionId, solution);
          return { solutionsCache: newCache };
        });
        return solution;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch solution:", error);
      return null;
    }
  },

  // Initialize data on login - ONLY profile and history (lightweight)
  initializeData: async () => {
    const state = get();
    if (state.isInitialized) return;

    set({ profileLoading: true, historyLoading: true });

    try {
      // Fetch profile and history in parallel (just 2 calls)
      const [profileResult, historyResult] = await Promise.allSettled([
        getUserProfile(),
        getUserHistory(),
      ]);

      set({
        profile:
          profileResult.status === "fulfilled" ? profileResult.value : null,
        profileError:
          profileResult.status === "rejected"
            ? profileResult.reason?.message
            : null,
        profileLoading: false,

        history:
          historyResult.status === "fulfilled" ? historyResult.value : [],
        historyError:
          historyResult.status === "rejected"
            ? historyResult.reason?.message
            : null,
        historyLoading: false,

        isInitialized: true,
        lastSyncAt: new Date(),
      });

      // NO solution pre-fetching - Motia can't handle multiple concurrent requests
    } catch (error) {
      set({
        profileLoading: false,
        historyLoading: false,
        profileError:
          error instanceof Error ? error.message : "Failed to load data",
      });
    }
  },

  // Refresh profile only
  refreshProfile: async () => {
    set({ profileLoading: true, profileError: null });
    try {
      const profile = await getUserProfile();
      set({ profile, profileLoading: false, lastSyncAt: new Date() });
    } catch (error) {
      set({
        profileLoading: false,
        profileError:
          error instanceof Error ? error.message : "Failed to refresh profile",
      });
    }
  },

  // Refresh history only
  refreshHistory: async () => {
    set({ historyLoading: true, historyError: null });
    try {
      const history = await getUserHistory();
      set({ history, historyLoading: false, lastSyncAt: new Date() });
    } catch (error) {
      set({
        historyLoading: false,
        historyError:
          error instanceof Error ? error.message : "Failed to refresh history",
      });
    }
  },

  // Clear all data on logout
  clearData: () => {
    set({
      profile: null,
      profileLoading: false,
      profileError: null,
      history: [],
      historyLoading: false,
      historyError: null,
      solutionsCache: new Map(),
      isInitialized: false,
      lastSyncAt: null,
    });
  },
}));
