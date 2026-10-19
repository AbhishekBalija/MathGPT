import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import NeoMascot from "../components/brand/NeoMascot";
import { ClassSteps } from "../features/onboarding/ClassSteps";
import { markWelcomeShown } from "../features/onboarding/welcome-shown";
import type { User } from "../services/auth.service";
import { classService } from "../services/class.service";
import { useAuthStore } from "../stores/authStore";

/**
 * /welcome: Neo says hello, then asks the class and board once after
 * sign-up (#39). Skip is always there and never blocks solving.
 */
const Welcome = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [stage, setStage] = useState<"hello" | "steps">("hello");

  useEffect(() => {
    markWelcomeShown();
  }, []);

  if (user?.onboarding === "done" && stage === "hello") {
    return <Navigate to="/app" replace />;
  }

  function finish(updated: User) {
    const stored = useAuthStore.getState().user;
    setUser({ ...stored, ...updated });
    navigate("/app", { replace: true });
  }

  async function skipFromHello() {
    try {
      finish(await classService.skip());
    } catch {
      // Not saved, so they'll be asked next visit; never block the app
      navigate("/app", { replace: true });
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0a0a0a]">
      <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-4 pb-4">
        {stage === "hello" ? (
          <>
            <div className="flex justify-end py-3">
              <button
                type="button"
                onClick={() => void skipFromHello()}
                className="min-h-11 px-1 text-sm font-semibold text-gray-600 dark:text-gray-400"
              >
                Skip for now
              </button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-lg font-bold text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-50">
                Hi, I'm Neo!
              </p>
              <NeoMascot className="mt-4 w-32" />
              <p className="mt-5 max-w-72 text-sm text-gray-600 dark:text-gray-400">
                A few quick questions, so your steps fit your class. It takes 10 seconds.
              </p>
            </div>
            <div className="border-t border-gray-200 pt-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => setStage("steps")}
                className="min-h-12 w-full rounded-2xl bg-gray-900 font-semibold text-white dark:bg-gray-50 dark:text-gray-900"
              >
                Let's go
              </button>
            </div>
          </>
        ) : (
          <ClassSteps
            onSaved={finish}
            // A failed skip still opens the app: solving is never blocked
            onSkip={(updated) => (updated ? finish(updated) : navigate("/app", { replace: true }))}
            onBackFromFirst={() => setStage("hello")}
          />
        )}
      </main>
    </div>
  );
};

export default Welcome;
