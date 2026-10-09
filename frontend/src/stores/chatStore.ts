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
  solutionId?: string; // For history items - used to fetch full solution on demand
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  // State
  chats: Chat[];
  activeChatId: string | null;
  isLoading: boolean;
  globalLoading: boolean; // For app-wide loading overlay
  solutionLoading: boolean; // For solution fetch (shows skeleton, not overlay)
  error: string | null;
  sidebarOpen: boolean;
  showAnswerPanel: boolean;
  historyLoaded: boolean;
  isProfileOpen: boolean;
  // Solver page: problem waiting to be sent, last solve error, and which view is open
  pendingProblem: string | null;
  solveError: { message: string; retryAfter?: number } | null;
  view: "all" | "one" | "hint";

  // Actions
  setPendingProblem: (problem: string | null) => void;
  setSolveError: (error: { message: string; retryAfter?: number } | null) => void;
  setView: (view: "all" | "one" | "hint") => void;
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
  setGlobalLoading: (loading: boolean) => void;
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
  fetchSolution: (chatId: string, solutionId: string) => Promise<void>;
  deleteChat: (chatId: string, solutionId?: string) => Promise<boolean>;
  clearAllChats: () => Promise<boolean>;
  toggleProfileModal: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  isLoading: false,
  globalLoading: false,
  solutionLoading: false,
  error: null,
  sidebarOpen: false,
  showAnswerPanel: false,
  historyLoaded: false,
  pendingProblem: null,
  solveError: null,
  view: "all",

  setPendingProblem: (problem) => set({ pendingProblem: problem }),
  setSolveError: (error) => set({ solveError: error }),
  setView: (view) => set({ view }),

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

  fetchSolution: async (chatId, solutionId) => {
    // First check if solution is already cached (instant)
    const { useAppDataStore } = await import("./appDataStore");
    const cachedSolution = useAppDataStore
      .getState()
      .getCachedSolution(solutionId);

    if (cachedSolution) {
      // Use cached solution - instant!
      const solution = {
        id: cachedSolution.id,
        problem: cachedSolution.problem,
        problemType: cachedSolution.problemType as Solution["problemType"],
        steps: cachedSolution.steps.map((s) => ({
          ...s,
          status: s.status as Step["status"],
        })),
        finalAnswer: cachedSolution.finalAnswer,
        summary: cachedSolution.summary,
        processingTimeMs: cachedSolution.processingTimeMs,
        createdAt: new Date(cachedSolution.createdAt),
      };

      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, solution } : chat
        ),
        showAnswerPanel: true,
      }));
      return;
    }

    // Not cached - fetch and cache (use solutionLoading for skeleton, not globalLoading)
    set({ solutionLoading: true, showAnswerPanel: true });
    try {
      const solutionData = await useAppDataStore
        .getState()
        .fetchAndCacheSolution(solutionId);

      if (solutionData) {
        const solution = {
          id: solutionData.id,
          problem: solutionData.problem,
          problemType: solutionData.problemType as Solution["problemType"],
          steps: solutionData.steps.map((s) => ({
            ...s,
            status: s.status as Step["status"],
          })),
          finalAnswer: solutionData.finalAnswer,
          summary: solutionData.summary,
          processingTimeMs: solutionData.processingTimeMs,
          createdAt: new Date(solutionData.createdAt),
        };

        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, solution } : chat
          ),
          showAnswerPanel: true,
        }));
      }
    } finally {
      set({ solutionLoading: false });
    }
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

  setGlobalLoading: (loading) => {
    set({ globalLoading: loading });
  },

  isProfileOpen: false,
  toggleProfileModal: () =>
    set((state) => ({ isProfileOpen: !state.isProfileOpen })),

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
      solutionId: item.id, // Store solution ID for on-demand fetching
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

  deleteChat: async (chatId, solutionId) => {
    set({ globalLoading: true });
    try {
      // If there's a solutionId, delete from backend
      if (solutionId) {
        const { deleteSolution } = await import("../services/history.service");
        const success = await deleteSolution(solutionId);
        if (!success) {
          return false;
        }
      }

      // Remove from local state
      set((state) => {
        const newChats = state.chats.filter((c) => c.id !== chatId);
        const isActiveDeleted = state.activeChatId === chatId;
        return {
          chats: newChats,
          activeChatId: isActiveDeleted
            ? newChats[0]?.id || null
            : state.activeChatId,
          showAnswerPanel: isActiveDeleted ? false : state.showAnswerPanel,
        };
      });
      return true;
    } finally {
      set({ globalLoading: false });
    }
  },

  clearAllChats: async () => {
    set({ globalLoading: true });
    try {
      const { clearAllHistory } = await import("../services/history.service");
      const success = await clearAllHistory();

      // Only clear local state if backend succeeds (matches deleteChat pattern)
      if (success) {
        set({
          chats: [],
          activeChatId: null,
          showAnswerPanel: false,
        });
      }

      return success;
    } catch (error) {
      console.warn("clearAllChats API error:", error);
      return false;
    } finally {
      set({ globalLoading: false });
    }
  },
}));
