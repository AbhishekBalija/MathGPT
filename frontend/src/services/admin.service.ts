import api from "./api";

// Types for admin responses
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  provider?: string;
  avatar?: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalSolutions: number;
  solutionsByType: Record<string, number>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
}

export interface UsersListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

// Admin service
export const adminService = {
  /**
   * Verify admin passcode for secondary authentication
   */
  verifyPasscode: async (passcode: string): Promise<{ success: true }> => {
    const response = await api.post<{ success: true }>(
      "/admin/verify-passcode",
      {
        passcode,
      }
    );
    return response.data;
  },

  /**
   * Get dashboard stats
   */
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get<AdminStats>("/admin/stats");
    return response.data;
  },

  /**
   * Get analytics data
   */
  getAnalytics: async (): Promise<AnalyticsResponse> => {
    const response = await api.get<AnalyticsResponse>("/admin/analytics");
    return response.data;
  },

  /**
   * Get token usage stats and estimated costs
   */
  getTokenStats: async (): Promise<TokenStatsResponse> => {
    const response = await api.get<TokenStatsResponse>("/admin/token-stats");
    return response.data;
  },

  /**
   * Get users list with pagination
   */
  getUsers: async (
    page = 1,
    limit = 20,
    search?: string
  ): Promise<UsersListResponse> => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (search) params.append("search", search);

    const response = await api.get<UsersListResponse>(
      `/admin/users?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Update user admin role
   */
  updateUserRole: async (
    userId: string,
    isAdmin: boolean
  ): Promise<{ success: true; user: AdminUser }> => {
    const response = await api.patch<{ success: true; user: AdminUser }>(
      `/admin/users/${userId}/role`,
      { isAdmin }
    );
    return response.data;
  },

  /**
   * Delete a user
   */
  deleteUser: async (
    userId: string
  ): Promise<{ success: true; deletedSolutions: number }> => {
    const response = await api.delete<{
      success: true;
      deletedSolutions: number;
    }>(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Get errors with stats
   */
  getErrors: async (params?: {
    limit?: number;
    errorCode?: string;
    userId?: string;
    includeResolved?: boolean;
  }): Promise<ErrorsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", String(params.limit));
    if (params?.errorCode) searchParams.append("errorCode", params.errorCode);
    if (params?.userId) searchParams.append("userId", params.userId);
    if (params?.includeResolved) searchParams.append("includeResolved", "true");

    const url = searchParams.toString()
      ? `/admin/errors?${searchParams.toString()}`
      : "/admin/errors";
    const response = await api.get<ErrorsResponse>(url);
    return response.data;
  },

  /**
   * Resolve an error
   */
  resolveError: async (
    errorId: string
  ): Promise<{
    message: string;
    error: {
      id: string;
      resolved: boolean;
      resolvedBy: string;
      resolvedAt: string;
    };
  }> => {
    const response = await api.patch<{
      message: string;
      error: {
        id: string;
        resolved: boolean;
        resolvedBy: string;
        resolvedAt: string;
      };
    }>(`/admin/errors/${errorId}/resolve`);
    return response.data;
  },

  /**
   * Get waitlist entries
   */
  getWaitlist: async (): Promise<WaitlistResponse> => {
    const response = await api.get<WaitlistResponse>("/admin/waitlist");
    return response.data;
  },

  /**
   * Send invite to a waitlist user
   */
  inviteUser: async (
    email: string
  ): Promise<{
    success: boolean;
    message: string;
    inviteToken: string;
    expiresAt: string;
  }> => {
    const response = await api.post<{
      success: boolean;
      message: string;
      inviteToken: string;
      expiresAt: string;
    }>("/admin/invite-user", { email });
    return response.data;
  },

  /**
   * Resend confirmation email to a waitlist user
   */
  resendConfirmation: async (
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      "/admin/resend-confirmation",
      { email }
    );
    return response.data;
  },
};

// Error types
export interface ErrorItem {
  id: string;
  errorCode: string;
  errorMessage: string;
  problemText: string;
  userId?: string;
  resolved: boolean;
  createdAt: string;
}

export interface ErrorStats {
  total: number;
  unresolved: number;
  last24Hours: number;
  byCode: Array<{ errorCode: string; count: number }>;
}

export interface ErrorsResponse {
  stats: ErrorStats;
  errors: ErrorItem[];
}

// Analytics types
export interface AnalyticsEvent {
  id: string;
  eventName: string;
  properties: Record<string, unknown>;
  userId?: string;
  createdAt: string;
}

export interface AnalyticsResponse {
  eventsByType: Array<{ eventName: string; count: number }>;
  recentEvents: AnalyticsEvent[];
  totalEvents: number;
}

// Token stats types
export interface TokenStatsResponse {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  solutionCount: number;
  avgTokensPerSolution: number;
}

// Waitlist types
export interface WaitlistEntry {
  email: string;
  source: string;
  status: "pending" | "approved" | "registered";
  createdAt: string;
  approvedAt?: string;
  inviteExpiresAt?: string;
  inviteExpired?: boolean;
}

export interface WaitlistResponse {
  entries: WaitlistEntry[];
  total: number;
  counts: {
    pending: number;
    approved: number;
    registered: number;
  };
}

export default adminService;
