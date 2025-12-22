import { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import AnswerPanel from "../components/AnswerPanel";
import PanelResizer from "../components/PanelResizer";
import LoadingOverlay from "../components/LoadingOverlay";
import ProfileModal from "../components/ProfileModal";
import { useChatStore } from "../stores/chatStore";
import { useDataSync } from "../hooks/useDataSync";

const AppLayout = () => {
  // Initialize data synchronization (pre-fetch + polling)
  useDataSync();
  // Access global state for sidebar
  const sidebarOpen = useChatStore((state) => state.sidebarOpen);
  const showAnswerPanel = useChatStore((state) => state.showAnswerPanel);

  // Constants
  const MIN_CHAT_WIDTH = 400; // Minimum width for chat window
  const MIN_ANSWER_WIDTH = 350; // Minimum width for answer panel

  // Layout State
  // Initial width for answer panel (in pixels) - e.g., 35-40% of screen width
  const [answerPanelWidth, setAnswerPanelWidth] = useState(
    Math.max(window.innerWidth * 0.35, 400)
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resizing answer panel
  const handleResize = (newDetailWidth: number) => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const availableWidth = containerWidth; // Sidebar is fixed/absolute on mobile or flex but effectively fixed

    // Calculate max allowable width for answer panel to save space for chat
    const maxDetailWidth = availableWidth - MIN_CHAT_WIDTH;

    // Clamp width
    const clampedWidth = Math.min(
      Math.max(newDetailWidth, MIN_ANSWER_WIDTH),
      maxDetailWidth
    );

    setAnswerPanelWidth(clampedWidth);
  };

  // Adjust width on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      if (window.innerWidth < 1024) {
        // Mobile/Tablet logic if needed
      } else {
        setAnswerPanelWidth((prev) => Math.min(prev, window.innerWidth * 0.45));
      }
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  return (
    <div className="flex h-screen bg-white dark:bg-[#0f1117] relative overflow-hidden">
      <LoadingOverlay />
      <ProfileModal />

      {/* Sidebar - Fixed width or mobile drawer */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden relative transition-all duration-300 ${
          sidebarOpen ? "lg:ml-0" : "lg:ml-0"
        }`}
      >
        {/* Chat Window - takes remaining space */}
        <div className="flex-1 flex flex-col h-full min-w-0 relative z-0">
          <ChatWindow />
        </div>

        {/* Resizer & Answer Panel */}
        {showAnswerPanel && (
          <>
            <PanelResizer onResize={handleResize} minWidth={MIN_ANSWER_WIDTH} />
            <div
              style={{ width: answerPanelWidth }}
              className="hidden lg:flex flex-col h-full border-l border-gray-200 dark:border-white/5 bg-white dark:bg-[#0f1117]"
            >
              <AnswerPanel />
            </div>
          </>
        )}
      </div>

      {/* Mobile Answer Overlay */}
      {showAnswerPanel && (
        <div className="lg:hidden fixed inset-0 z-30 bg-white dark:bg-[#0f1117] flex flex-col pt-16">
          <AnswerPanel />
        </div>
      )}
    </div>
  );
};

export default AppLayout;
