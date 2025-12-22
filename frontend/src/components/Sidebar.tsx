import { useEffect, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import { useAuthStore } from "../stores/authStore";
import { useAppDataStore } from "../stores/appDataStore";
import { useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

const Sidebar = () => {
  const {
    chats,
    activeChatId,
    sidebarOpen,
    historyLoaded,
    createNewChat,
    setActiveChat,
    toggleSidebar,
    loadHistory,
    fetchSolution,
    deleteChat,
    clearAllChats,
    toggleProfileModal,
  } = useChatStore();

  const { user, logout } = useAuthStore();
  // Use cached history from appDataStore
  const {
    history: cachedHistory,
    isInitialized,
    historyLoading,
  } = useAppDataStore();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  // Sync cached history to chatStore when appDataStore updates
  useEffect(() => {
    if (isInitialized && cachedHistory.length > 0 && !historyLoaded) {
      loadHistory(cachedHistory);
    }
  }, [isInitialized, cachedHistory, historyLoaded, loadHistory]);

  // Theme Toggle Logic
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    // Default to dark if no preference, or if system prefers dark
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChatClick = (chat: (typeof chats)[0]) => {
    setActiveChat(chat.id);
    // If chat has a solutionId but no loaded solution, fetch it
    if (chat.solutionId && !chat.solution) {
      fetchSolution(chat.id, chat.solutionId);
    }
    // Close sidebar after selecting a chat
    toggleSidebar();
  };

  return (
    <>
      {/* 
        Toggle Button Logic: 
        1. When closed: Floating hamburger menu (top-left)
        2. When open: Integrated close button inside Sidebar header (top-right of sidebar)
      */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all active:scale-95"
          aria-label="Open sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-[#0f1117]/98 backdrop-blur-2xl border-r border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-300 transition-transform duration-300 z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "280px" }}
      >
        <div className="flex flex-col h-full">
          {/* Header Area */}
          <div className="flex items-center justify-between p-4 pt-5 pb-2">
            <div className="flex items-center gap-2 px-2">
              <img
                src="/MathGPT-logo1.png"
                alt="MathGPT"
                className="w-8 h-8 object-contain"
              />
              <span className="text-base font-['Rye'] font-normal text-gray-900 dark:text-white tracking-tight">
                MathGPT
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              {/* Close Button - Integrated */}
              <button
                onClick={toggleSidebar}
                className="p-2 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" /* X icon */
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="px-4 pb-4 pt-2">
            <button
              onClick={() => {
                createNewChat();
                toggleSidebar();
              }}
              className="group w-full flex items-center gap-3 px-4 py-3.5 bg-black dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-gray-200 dark:shadow-blue-900/20 transition-all active:scale-[0.98]"
            >
              <div className="p-1 bg-white/20 rounded-lg group-hover:rotate-90 transition-transform duration-300">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <span className="font-semibold tracking-wide">
                New Calculation
              </span>
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">
            <div className="flex items-center justify-between px-3 pb-2 mt-2 border-b border-gray-100 dark:border-white/5 mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Recent History
              </span>
              {chats.length > 0 && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Delete all ${chats.length} chat(s)? This cannot be undone.`
                      )
                    ) {
                      clearAllChats();
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  Clear All
                </button>
              )}
            </div>

            {historyLoading && !historyLoaded ? (
              // Loading skeleton
              <div className="space-y-2 px-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center gap-3 px-3 py-3 rounded-xl"
                  >
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-600">
                No calculations yet
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`relative group/item rounded-xl transition-all duration-200 ${
                    chat.id === activeChatId
                      ? "bg-gray-100 dark:bg-white/10 shadow-sm"
                      : "hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <button
                    onClick={() => handleChatClick(chat)}
                    className={`w-full text-left px-3 py-3 pr-10 ${
                      chat.id === activeChatId
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <svg
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          chat.id === activeChatId
                            ? "text-black dark:text-blue-400"
                            : "text-gray-400 dark:text-gray-600 group-hover/item:text-gray-600 dark:group-hover/item:text-gray-500"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      <span className="truncate text-sm font-medium">
                        {chat.title || "Untitled Problem"}
                      </span>
                    </div>
                  </button>
                  {/* Delete Button - always visible on mobile, hover on desktop */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this chat?")) {
                        deleteChat(chat.id, chat.solutionId);
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    title="Delete chat"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 mt-auto backdrop-blur-sm">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleProfileModal}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 font-medium ring-2 ring-gray-100 dark:ring-white/10 hover:ring-gray-300 dark:hover:ring-gray-500 transition-all cursor-pointer"
                title="View Profile"
              >
                {user?.email?.[0].toUpperCase() || "U"}
              </button>
              <button
                onClick={toggleProfileModal}
                className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer"
                title="View Profile"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                title="Log out"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
