import { useEffect, useRef, useCallback } from "react";
import { useAppDataStore } from "../stores/appDataStore";
import { useAuthStore } from "../stores/authStore";

// Longer polling interval to avoid rate limits (60 seconds)
const POLLING_INTERVAL = 60000;

// Minimum time between refreshes (prevents rapid calls)
const MIN_REFRESH_INTERVAL = 30000;

/**
 * Hook that handles data synchronization:
 * - Initializes data when user is authenticated
 * - Polls for updates every 60 seconds (not 15 to avoid rate limits)
 * - Pauses when tab is hidden
 * - Throttles refreshes to prevent spam
 */
export function useDataSync() {
  const { isAuthenticated } = useAuthStore();
  const { initializeData, refreshAll, clearData, isInitialized, lastSyncAt } =
    useAppDataStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);

  // Throttled refresh - only refreshes if enough time has passed
  const throttledRefresh = useCallback(() => {
    const now = new Date();
    const lastSync = lastSyncAt;

    // Only refresh if at least MIN_REFRESH_INTERVAL has passed
    if (
      !lastSync ||
      now.getTime() - lastSync.getTime() >= MIN_REFRESH_INTERVAL
    ) {
      refreshAll();
    }
  }, [refreshAll, lastSyncAt]);

  // Initialize data when authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      initializeData();
    }
  }, [isAuthenticated, isInitialized, initializeData]);

  // Set up polling with longer interval
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval and data on logout
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearData();
      return;
    }

    // Start polling with longer interval
    intervalRef.current = setInterval(() => {
      // Only refresh if tab is visible
      if (isVisibleRef.current) {
        throttledRefresh();
      }
    }, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, throttledRefresh, clearData]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;

      // Refresh when tab becomes visible, but with throttling
      if (!document.hidden && isAuthenticated) {
        throttledRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, throttledRefresh]);
}

export default useDataSync;
