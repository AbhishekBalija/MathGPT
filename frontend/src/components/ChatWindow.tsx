import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../stores/chatStore";
import { solveProblem } from "../services/solve.service";
import katex from "katex";
import { sanitizeHtml, escapeHtml } from "../utils/sanitize";
import { getUserFriendlyError } from "../utils/errorMessages";

// Helper to render LaTeX with XSS protection
const renderLatex = (text: string) => {
  try {
    const html = katex.renderToString(text, {
      throwOnError: false,
      displayMode: true,
    });
    // Sanitize KaTeX output for extra safety
    return sanitizeHtml(html);
  } catch {
    // Escape HTML in fallback to prevent XSS
    return escapeHtml(text);
  }
};

const ChatWindow = () => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    chats,
    activeChatId,
    isLoading,
    solutionLoading,
    showAnswerPanel,
    addMessage,
    setSolution,
    setLoading,
    setError,
    createNewChat,
    setShowAnswerPanel,
  } = useChatStore();

  const activeChat = chats.find((c) => c.id === activeChatId);

  // Disable input when loading or fetching solution
  const inputDisabled = isLoading || solutionLoading;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, isLoading]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    // Add user message
    addMessage(chatId, { role: "user", content: textToSend });
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const result = await solveProblem({
        problem: textToSend,
        chatId: chatId,
      });

      if (result.success && result.solution) {
        addMessage(chatId!, {
          role: "assistant",
          content:
            "I've solved this step by step. Check the solution panel for details.",
        });
        setSolution(chatId!, result.solution);
      } else {
        // Handle error - sanitize message for user display
        const userMessage = getUserFriendlyError(
          result.error || "Failed to solve problem"
        );
        addMessage(chatId!, {
          role: "assistant",
          content: `Sorry, I couldn't solve this problem. ${userMessage}`,
        });
        setError(userMessage);
      }
    } catch (err) {
      // Sanitize error message - never show raw API errors to users
      const userMessage = getUserFriendlyError(err);
      addMessage(chatId!, {
        role: "assistant",
        content: `Sorry, something went wrong. ${userMessage}`,
      });
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Solve x² + 5x + 6 = 0",
    "Simplify (3x² + 6x) / 3x",
    "Derivative of sin(x)",
    "Integrate x² dx",
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#0a0a0a] relative transition-colors duration-300">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 pb-32 scroll-smooth">
        {!activeChat || activeChat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
            {/* NEO Avatar - Centered & Blue/Cyan Theme */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-linear-to-br from-blue-500 via-cyan-400 to-blue-600 p-1 shadow-xl shadow-cyan-500/20 hover:scale-105 transition-transform flex items-center justify-center overflow-hidden">
                <img
                  src="/neo-avatar.png"
                  alt="NEO"
                  className="w-full h-full rounded-full object-cover bg-gray-900 scale-160"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
              Meet{" "}
              <span className="bg-linear-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                NEO
              </span>
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-sm mb-6 sm:mb-8 leading-relaxed px-4 sm:px-0">
              Your personal math assistant. Type a problem or snap a photo, and
              I'll break it down step-by-step.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 text-sm text-gray-600 dark:text-gray-300 rounded-xl transition-all text-left flex items-center justify-between group"
                >
                  <span className="truncate">{suggestion}</span>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 py-4">
            {activeChat.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                    message.role === "user" ? "bg-blue-600 text-white" : ""
                  }`}
                >
                  {message.role === "user" ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  ) : (
                    <img
                      src="/neo-avatar.png"
                      alt="NEO"
                      className="w-full h-full rounded-full object-cover scale-[1.8]"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML =
                          '<span class="text-xs font-bold">N</span>';
                      }}
                    />
                  )}
                </div>

                <div
                  className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                  }`}
                >
                  {message.content.includes("\\") ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderLatex(message.content),
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 animate-pulse">
                  <img
                    src="/neo-avatar.png"
                    alt="NEO"
                    className="w-full h-full object-cover scale-[1.6]"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.innerHTML =
                        '<span class="text-xs font-bold text-white">N</span>';
                    }}
                  />
                </div>
                <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Thinking
                  </span>
                  <div className="flex gap-1">
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Floating at bottom */}
      <div className="p-4 sm:p-6 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 absolute bottom-0 left-0 right-0 z-10 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          {/* Show input only if no solution exists yet */}
          {!activeChat?.solution && !solutionLoading ? (
            <>
              <div
                className={`flex items-end gap-2 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-400 dark:focus-within:border-blue-600 transition-all ${
                  inputDisabled ? "opacity-50" : ""
                }`}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a math problem..."
                  disabled={inputDisabled}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder-gray-400 min-h-[44px] max-h-[120px] py-2.5 px-3 disabled:cursor-not-allowed"
                  rows={1}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || inputDisabled}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-blue-500/20"
                >
                  <svg
                    className="w-5 h-5 transform rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
              <div className="text-center mt-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-semibold">
                  Powered by NEO • Verified Steps
                </span>
              </div>
            </>
          ) : (
            /* Solution exists - show action buttons together */
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Problem solved! View the solution or start fresh.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {!showAnswerPanel && (
                  <button
                    onClick={() => setShowAnswerPanel(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all active:scale-95 font-medium"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    View Solution
                  </button>
                )}
                <button
                  onClick={createNewChat}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all active:scale-95 font-medium"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Problem
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
