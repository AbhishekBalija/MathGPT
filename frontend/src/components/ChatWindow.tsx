import { useState, useRef, useEffect } from "react";
import { useChatStore, type Solution, type Step } from "../stores/chatStore";
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
    addMessage,
    setSolution,
    setLoading,
    createNewChat,
  } = useChatStore();

  const activeChat = chats.find((c) => c.id === activeChatId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    // Add user message
    addMessage(chatId, { role: "user", content: input });
    setInput("");
    setLoading(true);

    // Simulate AI response (mock for now)
    setTimeout(() => {
      addMessage(chatId!, {
        role: "assistant",
        content:
          "I'll solve this step by step. Check the solution panel on the right.",
      });

      // Mock solution
      const mockSolution: Solution = {
        id: crypto.randomUUID(),
        steps: [
          {
            stepNumber: 1,
            expression: "x^2 + 2x + 1 = 0",
            justification: "Original equation",
            status: "VERIFIED",
          },
          {
            stepNumber: 2,
            expression: "(x + 1)^2 = 0",
            justification: "Factor the perfect square trinomial",
            status: "VERIFIED",
          },
          {
            stepNumber: 3,
            expression: "x + 1 = 0",
            justification: "Take square root of both sides",
            status: "VERIFIED",
          },
          {
            stepNumber: 4,
            expression: "x = -1",
            justification: "Subtract 1 from both sides",
            status: "VERIFIED",
          },
        ] as Step[],
        summary: "The solution is x = -1",
        createdAt: new Date(),
      };

      setSolution(chatId!, mockSolution);
      setLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {!activeChat || activeChat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              How can I help you with math today?
            </h2>
            <p className="text-gray-500 max-w-md">
              Type a math problem and I'll provide a step-by-step verified
              solution.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {activeChat.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-900 shadow-sm"
                  }`}
                >
                  {message.content.includes("\\") ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderLatex(message.content),
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your math problem here... (e.g., Solve x² + 2x + 1 = 0)"
              className="flex-1 bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-500 min-h-[24px] max-h-[200px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
