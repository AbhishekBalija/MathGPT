import LoadingOverlay from "../components/LoadingOverlay";
import ProfileModal from "../components/ProfileModal";
import { SolverPage } from "../features/solver/SolverPage";
import { useDataSync } from "../hooks/useDataSync";

const AppLayout = () => {
  // Initialize data synchronization (pre-fetch + polling)
  useDataSync();

  return (
    <div className="relative overflow-hidden">
      <LoadingOverlay />
      <ProfileModal />
      <SolverPage />
    </div>
  );
};

export default AppLayout;
