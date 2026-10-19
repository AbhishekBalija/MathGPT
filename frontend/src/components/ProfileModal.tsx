import { useChatStore } from "../stores/chatStore";
import { useAppDataStore } from "../stores/appDataStore";
import { useAuthStore } from "../stores/authStore";
import { ClassSteps } from "../features/onboarding/ClassSteps";
import { describeClass } from "../features/onboarding/class-options";
import type { User } from "../services/auth.service";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

// "2026-10-02T..." -> "Oct 2026"
function joinedMonth(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const ProfileModal = () => {
  const { isProfileOpen, toggleProfileModal } = useChatStore();
  const { profile, profileLoading: loading, profileError: error, refreshProfile } = useAppDataStore();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Animation state for mobile slide-up
  const [isAnimating, setIsAnimating] = useState(false);
  // Change swaps the Profile for the class and board steps
  const [changingClass, setChangingClass] = useState(false);

  useEffect(() => {
    if (isProfileOpen) {
      // Trigger animation after mount
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      // Reset in a callback so the effect itself stays pure
      // and the next open starts on the Profile, not half-way through Change
      requestAnimationFrame(() => {
        setIsAnimating(false);
        setChangingClass(false);
      });
    }
  }, [isProfileOpen]);

  if (!isProfileOpen) return null;

  function classSaved(updated: User) {
    setUser({ ...useAuthStore.getState().user, ...updated });
    setChangingClass(false);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-colors duration-300 ${
        isAnimating ? "bg-black/50" : "bg-black/0"
      } backdrop-blur-sm`}
      onClick={toggleProfileModal}
    >
      <div
        className={`bg-white dark:bg-[#0f0f0f] w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl transition-transform duration-300 ease-out ${
          isAnimating ? "translate-y-0" : "translate-y-full sm:translate-y-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white dark:bg-[#0f0f0f]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Profile</h2>
          <button
            onClick={toggleProfileModal}
            aria-label="Close"
            className="grid size-11 place-items-center text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 pb-6">
          {changingClass ? (
            <ClassSteps
              initial={user?.classInfo}
              onSaved={classSaved}
              onBackFromFirst={() => setChangingClass(false)}
            />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{error}</p>
              <button onClick={refreshProfile} className="text-sm text-gray-600 dark:text-gray-300 hover:underline">
                Try again
              </button>
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-gray-100 dark:bg-white/10 grid place-items-center shrink-0 overflow-hidden">
                  {profile.user.avatar ? (
                    <img
                      src={profile.user.avatar}
                      alt={profile.user.name}
                      className="size-12 rounded-full object-cover"
                      onError={(e) => {
                        // Hide a broken image and show the initial instead
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement?.querySelector("span")?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <span
                    className={`text-lg font-semibold text-gray-700 dark:text-gray-300 ${profile.user.avatar ? "hidden" : ""}`}
                  >
                    {profile.user.name?.[0]?.toUpperCase() || profile.user.email[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {profile.user.name || profile.user.email.split("@")[0]}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{profile.user.email}</p>
                </div>
              </div>

              {/* The Onboarding answer, changeable here (#39) */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-white/10 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Your class
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">{describeClass(user?.classInfo)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setChangingClass(true)}
                  className="min-h-11 shrink-0 rounded-xl border border-gray-200 dark:border-white/10 px-3 text-sm font-semibold text-gray-900 dark:text-white"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-3">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{profile.stats.totalSolutions}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Problems solved</p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-3">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{joinedMonth(profile.user.createdAt)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Joined</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
