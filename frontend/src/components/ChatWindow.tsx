import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../stores/chatStore";
import { solveProblem } from "../services/solve.service";
import katex from "katex";

// Helper to render LaTeX
const renderLatex = (text: string) => {
  try {
    return katex.renderToString(text, {
      throwOnError: false,
      displayMode: true,
    });
  } catch {
    return text;
  }
};

const ChatWindow = () => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    chats,
    activeChatId,
    isLoading,
    showAnswerPanel,
    addMessage,
    setSolution,
    setLoading,
    setError,
    createNewChat,
    setShowAnswerPanel,
  } = useChatStore();

  const activeChat = chats.find((c) => c.id === activeChatId);

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
        // Handle error
        const errorMessage = result.error || "Failed to solve problem";
        addMessage(chatId!, {
          role: "assistant",
          content: `Sorry, I couldn't solve this problem. ${errorMessage}`,
        });
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      addMessage(chatId!, {
        role: "assistant",
        content: `Sorry, something went wrong. ${errorMessage}`,
      });
      setError(errorMessage);
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
    <div className="flex flex-col h-full min-h-0 bg-white relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 scroll-smooth">
        {!activeChat || activeChat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-linear-to-tr from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20 rotate-3 transform hover:rotate-6 transition-transform">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Math Solver AI
            </h2>
            <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
              Snap a photo or type a problem. I'll provide verified step-by-step
              solutions instantly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-blue-300 text-sm text-gray-600 rounded-xl transition-all text-left flex items-center justify-between group"
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-indigo-100 text-indigo-700"
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  )}
                </div>

                <div
                  className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm"
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
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 animate-pulse"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium">
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
      <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-lg border-t border-gray-100 absolute bottom-0 left-0 right-0 z-10">
        <div className="max-w-3xl mx-auto relative">
          {/* Show input only if no solution exists yet */}
          {!activeChat?.solution ? (
            <>
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a math problem..."
                  className="flex-1 bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 min-h-[44px] max-h-[120px] py-2.5 px-3"
                  rows={1}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
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
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                  AI Powered • Verified Steps
                </span>
              </div>
            </>
          ) : (
            /* Solution exists - show new chat prompt */
            <div className="text-center py-2">
              <p className="text-sm text-gray-500 mb-3">
                This problem has been solved. Start a new chat for another
                problem.
              </p>
              <button
                onClick={createNewChat}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 font-semibold"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Problem
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Show Solution Button - appears when solution exists but panel is closed */}
      {activeChat?.solution && !showAnswerPanel && (
        <button
          onClick={() => setShowAnswerPanel(true)}
          className="fixed bottom-24 right-6 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-lg shadow-green-900/30 hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 z-20 group"
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-semibold">View Solution</span>
          <svg
            className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatWindow;
