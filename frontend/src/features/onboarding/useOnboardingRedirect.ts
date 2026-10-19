import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/auth.service";
import { useAuthStore } from "../../stores/authStore";
import { welcomeShownThisVisit } from "./welcome-shown";

export { WELCOME_SHOWN_KEY } from "./welcome-shown";

/**
 * For the app layout: refreshes the User from /auth/me once, so accounts from
 * before Onboarding learn they need it, then sends a student who still needs
 * it to /welcome once per visit (#39).
 */
export function useOnboardingRedirect(): void {
  const navigate = useNavigate();
  const onboarding = useAuthStore((state) => state.user?.onboarding);

  useEffect(() => {
    let current = true;
    authService
      .getCurrentUser()
      .then(({ user }) => {
        const stored = useAuthStore.getState().user;
        if (current && stored) useAuthStore.getState().setUser({ ...stored, ...user });
      })
      // The stored User still works; the next visit tries again
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    // A session saved before this shipped has no field: wait for /auth/me instead of guessing
    if (onboarding !== "needed" || welcomeShownThisVisit()) return;
    navigate("/welcome", { replace: true });
  }, [onboarding, navigate]);
}
