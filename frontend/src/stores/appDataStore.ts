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

  // Solutions cache - Pre-fetched full solutions by ID
  solutionsCache: Map<string, FullSolution>;
  solutionsFetching: Set<string>;

  // Sync state
  isInitialized: boolean;
  lastSyncAt: Date | null;

  // Actions
  initializeData: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshAll: () => Promise<void>;
  clearData: () => void;

  // Solution cache actions
  getCachedSolution: (solutionId: string) => FullSolution | null;
  fetchAndCacheSolution: (solutionId: string) => Promise<FullSolution | null>;
  prefetchSolutions: (solutionIds: string[]) => Promise<void>;
}

// Number of recent solutions to pre-fetch
const PREFETCH_COUNT = 10;

export const useAppDataStore = create<AppDataState>((set, get) => ({
  // Initial state
  profile: null,
  profileLoading: false,
  profileError: null,

  history: [],
  historyLoading: false,
  historyError: null,

  solutionsCache: new Map(),
  solutionsFetching: new Set(),

  isInitialized: false,
  lastSyncAt: null,

  // Get cached solution (instant)
  getCachedSolution: (solutionId) => {
    return get().solutionsCache.get(solutionId) || null;
  },

  // Fetch and cache a single solution
  fetchAndCacheSolution: async (solutionId) => {
    const cached = get().solutionsCache.get(solutionId);
    if (cached) return cached;

    // Check if already fetching
    if (get().solutionsFetching.has(solutionId)) {
      // Wait a bit and check again
      await new Promise((r) => setTimeout(r, 100));
      return get().solutionsCache.get(solutionId) || null;
    }

    // Mark as fetching
    set((state) => ({
      solutionsFetching: new Set([...state.solutionsFetching, solutionId]),
    }));

    try {
      const solution = await getSolutionById(solutionId);
      if (solution) {
        set((state) => {
          const newCache = new Map(state.solutionsCache);
          newCache.set(solutionId, solution);
          return { solutionsCache: newCache };
        });
        return solution;
      }
      return null;
    } finally {
      set((state) => {
        const newFetching = new Set(state.solutionsFetching);
        newFetching.delete(solutionId);
        return { solutionsFetching: newFetching };
      });
    }
  },

  // Pre-fetch multiple solutions in background
  prefetchSolutions: async (solutionIds) => {
    const cache = get().solutionsCache;
    const toFetch = solutionIds.filter((id) => !cache.has(id));

    // Fetch in parallel but limit concurrency
    const batchSize = 3;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      await Promise.all(batch.map((id) => get().fetchAndCacheSolution(id)));
    }
  },

  // Initialize all data on login
  initializeData: async () => {
    const state = get();
    if (state.isInitialized) return;

    set({ profileLoading: true, historyLoading: true });

    try {
      // Fetch profile and history in parallel
      const [profileResult, historyResult] = await Promise.allSettled([
        getUserProfile(),
        getUserHistory(),
      ]);

      const history =
        historyResult.status === "fulfilled" ? historyResult.value : [];

      set({
        profile:
          profileResult.status === "fulfilled" ? profileResult.value : null,
        profileError:
          profileResult.status === "rejected"
            ? profileResult.reason?.message
            : null,
        profileLoading: false,

        history,
        historyError:
          historyResult.status === "rejected"
            ? historyResult.reason?.message
            : null,
        historyLoading: false,

        isInitialized: true,
        lastSyncAt: new Date(),
      });

      // Pre-fetch solutions for recent history items in background
      if (history.length > 0) {
        const recentIds = history.slice(0, PREFETCH_COUNT).map((h) => h.id);
        // Don't await - let it happen in background
        get().prefetchSolutions(recentIds);
      }
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

  // Refresh all data (for polling)
  refreshAll: async () => {
    const [profileResult, historyResult] = await Promise.allSettled([
      getUserProfile(),
      getUserHistory(),
    ]);

    set({
      profile:
        profileResult.status === "fulfilled"
          ? profileResult.value
          : get().profile,
      history:
        historyResult.status === "fulfilled"
          ? historyResult.value
          : get().history,
      lastSyncAt: new Date(),
    });
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
      solutionsFetching: new Set(),
      isInitialized: false,
      lastSyncAt: null,
    });
  },
}));
