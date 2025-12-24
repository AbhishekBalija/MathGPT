import api from "./api";

// Types for auth responses
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin?: boolean;
  role?: "admin" | "user";
}

export interface AuthResponse {
  message?: string;
  email?: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ErrorResponse {
  error: string;
}

// Auth service with typed API calls
export const authService = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Register a new user with invite token
   */
  register: async (
    email: string,
    password: string,
    name: string,
    inviteToken?: string
  ): Promise<AuthResponse> => {
    // Use invite endpoint if token provided, otherwise fall back to regular
    const endpoint = inviteToken ? "/auth/register-invite" : "/auth/register";
    const response = await api.post<AuthResponse>(endpoint, {
      email,
      password,
      name,
      ...(inviteToken && { inviteToken }),
    });
    return response.data;
  },

  /**
   * Login with Google OAuth
   */
  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/google", {
      idToken,
    });
    return response.data;
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>("/auth/me");
    return response.data;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>("/auth/logout");
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await api.post<RefreshResponse>("/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },
};

export default authService;
