import { useState } from "react";
import { useChatStore } from "../stores/chatStore";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import AnswerPanel from "../components/AnswerPanel";
import PanelResizer from "../components/PanelResizer";
import LoadingOverlay from "../components/LoadingOverlay";

const AppLayout = () => {
  const { sidebarOpen, showAnswerPanel } = useChatStore();
  const [answerPanelWidth, setAnswerPanelWidth] = useState(400);

  return (
    <>
      {/* Global Loading Overlay */}
      <LoadingOverlay />

      <div className="h-screen w-screen flex overflow-hidden bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area - takes remaining space */}
        <div
          className="flex-1 flex overflow-hidden transition-all duration-300"
          style={{
            marginLeft: sidebarOpen ? "280px" : "0",
          }}
        >
          {/* Chat Window Container - scrolls internally */}
          <div
            className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
              showAnswerPanel ? "" : "w-full"
            }`}
          >
            <ChatWindow />
          </div>

          {/* Resizer + Answer Panel - Only visible after solution */}
          {showAnswerPanel && (
            <>
              <PanelResizer
                onResize={setAnswerPanelWidth}
                minWidth={300}
                maxWidth={800}
              />
              {/* Answer Panel Container - scrolls internally */}
              <div
                className="flex flex-col overflow-hidden bg-white dark:bg-[#0a0a0a] border-l border-gray-100 dark:border-gray-800"
                style={{ width: `${answerPanelWidth}px` }}
              >
                <AnswerPanel />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AppLayout;
