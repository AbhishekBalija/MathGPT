import { create } from "zustand";
import { getAppStatus, type AppStatus } from "../services/appStatus.service";

interface AppStatusState {
  // Null until the first load; the app then works as normal
  status: AppStatus | null;
  load: () => Promise<void>;
}

// Read on app start, and again when a solve or sign-up is refused, so a
// pause shows as the admin's message instead of an error
export const useAppStatus = create<AppStatusState>()((set) => ({
  status: null,
  load: async () => {
    try {
      set({ status: await getAppStatus() });
    } catch {
      // Keep what we had: a failed check must never block the app
    }
  },
}));
