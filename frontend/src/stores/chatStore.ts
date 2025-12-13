import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface Step {
  stepNumber: number;
  expression: string;
  justification: string;
  status: "VERIFIED" | "CORRECTED" | "FAILED";
  notes?: string;
}

export interface Solution {
  id: string;
  steps: Step[];
  summary?: string;
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
  sidebarOpen: boolean;
  showAnswerPanel: boolean;

  // Actions
  createNewChat: () => string;
  setActiveChat: (chatId: string) => void;
  addMessage: (chatId: string, message: Omit<Message, "id" | "timestamp">) => void;
  setSolution: (chatId: string, solution: Solution) => void;
  toggleSidebar: () => void;
  setShowAnswerPanel: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  isLoading: false,
  sidebarOpen: true,
  showAnswerPanel: false,

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
}));
