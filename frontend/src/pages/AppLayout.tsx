import { useState } from "react";
import { useChatStore } from "../stores/chatStore";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import AnswerPanel from "../components/AnswerPanel";
import PanelResizer from "../components/PanelResizer";

const AppLayout = () => {
  const { sidebarOpen, showAnswerPanel } = useChatStore();
  const [answerPanelWidth, setAnswerPanelWidth] = useState(400);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className="flex-1 flex transition-all duration-300"
        style={{
          marginLeft: sidebarOpen ? "280px" : "0",
        }}
      >
        {/* Chat Window */}
        <div
          className={`flex-1 transition-all duration-300 min-w-0 ${
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
            <div
              className="shrink-0"
              style={{ width: `${answerPanelWidth}px` }}
            >
              <AnswerPanel />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AppLayout;
