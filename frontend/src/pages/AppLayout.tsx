import LoadingOverlay from "../components/LoadingOverlay";
import ProfileModal from "../components/ProfileModal";
import { SolverPage } from "../features/solver/SolverPage";
import { useOnboardingRedirect } from "../features/onboarding/useOnboardingRedirect";
import { useDataSync } from "../hooks/useDataSync";

const AppLayout = () => {
  // Initialize data synchronization (pre-fetch + polling)
  useDataSync();
  // New students answer the Onboarding questions first (#39)
  useOnboardingRedirect();

  return (
    // overflow-clip, not overflow-hidden: a hidden box can still be scrolled
    // by the browser, so "Jump to answer" (#answer) shifted the whole app up
    // and left half the phone screen blank
    <div className="relative overflow-clip">
      <LoadingOverlay />
      <ProfileModal />
      <SolverPage />
    </div>
  );
};

export default AppLayout;
