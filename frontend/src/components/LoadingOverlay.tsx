import { useChatStore } from "../stores/chatStore";

/**
 * Global Loading Overlay
 *
 * Displays a transparent blurred overlay with loading animation
 * when globalLoading is true in the store.
 */
const LoadingOverlay = () => {
  const globalLoading = useChatStore((state) => state.globalLoading);

  if (!globalLoading) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-white/60 backdrop-blur-sm transition-all">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Loading</p>
          <p className="text-xs text-gray-500 mt-1">Please wait...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
