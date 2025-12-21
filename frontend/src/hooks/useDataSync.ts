import { useEffect } from "react";
import { useAppDataStore } from "../stores/appDataStore";
import { useAuthStore } from "../stores/authStore";

/**
 * Hook that handles data synchronization:
 * - Initializes data when user is authenticated
 * - NO polling (Motia can't handle frequent requests)
 * - Cleans up on logout
 */
export function useDataSync() {
  const { isAuthenticated } = useAuthStore();
  const { initializeData, clearData, isInitialized } = useAppDataStore();

  // Initialize data when authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      initializeData();
    }
  }, [isAuthenticated, isInitialized, initializeData]);

  // Clear data on logout
  useEffect(() => {
    if (!isAuthenticated) {
      clearData();
    }
  }, [isAuthenticated, clearData]);
}

export default useDataSync;
