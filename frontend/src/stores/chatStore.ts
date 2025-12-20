import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

// Problem types from backend
export type ProblemType =
  | "algebra"
  | "calculus_derivative"
  | "calculus_integral"
  | "calculus_limit"
  | "trigonometry"
  | "linear_algebra"
  | "geometry"
  | "statistics"
  | "unknown";

export interface Step {
  stepNumber: number;
  expression: string;
  justification: string;
  explanation: string; // Detailed explanation (expandable)
  status: "VERIFIED" | "CORRECTED" | "FAILED" | "PENDING";
  notes?: string;
}

export interface Solution {
  id: string;
  problem: string;
  problemType: ProblemType;
  steps: Step[];
  finalAnswer: string;
  summary: string;
  processingTimeMs: number;
  createdAt: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  solution?: Solution;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  // State
  chats: Chat[];
  activeChatId: string | null;
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  showAnswerPanel: boolean;
  historyLoaded: boolean;

  // Actions
  createNewChat: () => string;
  setActiveChat: (chatId: string) => void;
  addMessage: (
    chatId: string,
    message: Omit<Message, "id" | "timestamp">
  ) => void;
  setSolution: (chatId: string, solution: Solution) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  setShowAnswerPanel: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  loadHistory: (
    history: Array<{
      id: string;
      chatId?: string;
      problem: string;
      problemType: string;
      finalAnswer: string;
      summary: string;
      stepsCount: number;
      createdAt: string;
    }>
  ) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  isLoading: false,
  error: null,
  sidebarOpen: true,
  showAnswerPanel: false,
  historyLoaded: false,

  createNewChat: () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({
      chats: [newChat, ...state.chats],
      activeChatId: newChat.id,
      showAnswerPanel: false,
    }));
    return newChat.id;
  },

  setActiveChat: (chatId) => {
    const chat = get().chats.find((c) => c.id === chatId);
    set({
      activeChatId: chatId,
      showAnswerPanel: chat?.solution ? true : false,
    });
  },

  addMessage: (chatId, message) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, newMessage],
              title:
                chat.messages.length === 0 && message.role === "user"
                  ? message.content.slice(0, 30) + "..."
                  : chat.title,
              updatedAt: new Date(),
            }
          : chat
      ),
    }));
  },

  setSolution: (chatId, solution) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, solution } : chat
      ),
      showAnswerPanel: true,
    }));
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setShowAnswerPanel: (show) => {
    set({ showAnswerPanel: show });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  loadHistory: (history) => {
    // Convert history items to Chat objects
    const historyChats: Chat[] = history.map((item) => ({
      id: item.chatId || item.id,
      title:
        item.problem.slice(0, 40) + (item.problem.length > 40 ? "..." : ""),
      messages: [
        {
          id: "1",
          role: "user" as const,
          content: item.problem,
          timestamp: new Date(item.createdAt),
        },
        {
          id: "2",
          role: "assistant" as const,
          content: `Answer: ${item.finalAnswer}`,
          timestamp: new Date(item.createdAt),
        },
      ],
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.createdAt),
    }));

    set((state) => ({
      chats: [
        ...historyChats,
        ...state.chats.filter((c) => !historyChats.find((h) => h.id === c.id)),
      ],
      historyLoaded: true,
    }));
  },
}));
