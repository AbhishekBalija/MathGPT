import api from "./api";

// Types for admin responses
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  // Our own accounts, left out of business numbers. Admins are always team.
  isTeam: boolean;
  solves: number;
  lastSolvedAt: string | null;
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
   * Get dashboard stats
   */
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get<AdminStats>("/admin/stats");
    return response.data;
  },

  /**
   * Get analytics data
   */
  getAnalytics: async (event?: string): Promise<AnalyticsResponse> => {
    const query = event ? `?event=${encodeURIComponent(event)}` : "";
    const response = await api.get<AnalyticsResponse>(`/admin/analytics${query}`);
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
   * Every service checked live, solving this week, speed and what is live
   */
  getHealth: async (): Promise<AdminHealth> => {
    const response = await api.get<AdminHealth>("/admin/health");
    return response.data;
  },

  /**
   * Everything on the admin Overview, in one call
   */
  getOverview: async (): Promise<AdminOverview> => {
    const response = await api.get<AdminOverview>("/admin/overview");
    return response.data;
  },

  /**
   * Real students, who comes back, what they ask and what it costs
   */
  getBusiness: async (includeTeam: boolean): Promise<AdminBusiness> => {
    const response = await api.get<AdminBusiness>(`/admin/business${includeTeam ? "?includeTeam=true" : ""}`);
    return response.data;
  },

  /**
   * The numbers next to Failed solves, Reports and Feedback in the nav
   */
  getCounts: async (): Promise<AdminCounts> => {
    const response = await api.get<AdminCounts>("/admin/counts");
    return response.data;
  },

  /**
   * Failed solves, grouped by student and problem
   */
  getFailed: async (status: FailedStatus): Promise<FailedResponse> => {
    const response = await api.get<FailedResponse>(`/admin/failed?status=${status}`);
    return response.data;
  },

  /**
   * One failed problem, with every try
   */
  getFailedDetail: async (id: string): Promise<FailedDetail> => {
    const response = await api.get<FailedDetail>(`/admin/failed/${id}`);
    return response.data;
  },

  /**
   * Resolve every try of a failed problem
   */
  resolveFailed: async (id: string): Promise<{ resolved: number }> => {
    const response = await api.post<{ resolved: number }>(`/admin/failed/${id}/resolve`);
    return response.data;
  },

  /**
   * One report, with the full solution and who sent it
   */
  getReportDetail: async (id: string): Promise<ReportDetail> => {
    const response = await api.get<ReportDetail>(`/admin/reports/${id}`);
    return response.data;
  },

  /**
   * One student: what they did and today's limit
   */
  getStudent: async (id: string): Promise<StudentDetail> => {
    const response = await api.get<StudentDetail>(`/admin/students/${id}`);
    return response.data;
  },

  /**
   * Mark an account as one of ours, so it is left out of business numbers
   */
  setTeam: async (userId: string, isTeam: boolean): Promise<{ id: string; isTeam: boolean }> => {
    const response = await api.patch<{ id: string; isTeam: boolean }>(`/admin/users/${userId}/team`, { isTeam });
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
   * Get "something looks wrong" reports, newest first
   */
  getReports: async (limit = 50): Promise<ReportsResponse> => {
    const response = await api.get<ReportsResponse>(`/admin/reports?limit=${limit}`);
    return response.data;
  },

  /**
   * Get Feedback from Users, newest first. Done items only when asked for.
   */
  getFeedback: async (params: { includeDone: boolean; limit?: number }): Promise<FeedbackResponse> => {
    const query = new URLSearchParams();
    if (params.includeDone) query.append("includeDone", "true");
    if (params.limit) query.append("limit", String(params.limit));
    const response = await api.get<FeedbackResponse>(`/admin/feedback${query.size > 0 ? `?${query.toString()}` : ""}`);
    return response.data;
  },

  /**
   * Mark Feedback as read and handled
   */
  markFeedbackDone: async (feedbackId: string): Promise<{ done: boolean }> => {
    const response = await api.patch<{ done: boolean }>(`/admin/feedback/${feedbackId}/done`);
    return response.data;
  },

  /**
   * The report was a mistake: serve its answer from the shared cache again
   */
  unblockReport: async (reportId: string): Promise<{ cacheStatus: "shared" | "unchecked" }> => {
    const response = await api.post<{ cacheStatus: "shared" | "unchecked" }>(`/admin/reports/${reportId}/unblock`);
    return response.data;
  },
};

// The admin Health screen
export type HealthServiceId = "api" | "database" | "gemini" | "backup" | "email" | "turnstile" | "sentry" | "uptime";

export interface AdminHealth {
  checkedAt: string;
  services: Array<{ id: HealthServiceId; status: "up" | "down" | "key_set" | "key_missing"; ms: number | null; detail: string | null }>;
  solving: {
    tries24h: number;
    failed24h: number;
    days: Array<{ day: string; tries: number; failed: number }>;
    byCode: Array<{ errorCode: string; count: number }>;
  };
  speed: { avgMs: number; p90Ms: number };
  live: {
    backendCommit: string;
    migrations: { applied: number; latest: string; pending: string[] };
    env: Array<{ name: string; set: boolean }>;
    // The outside check in GitHub Actions that emails you when the site is down
    uptimeCheck: { lastRunAt: string | null; lastResult: "success" | "failure" | null; enabled: boolean };
  };
}

// The admin Overview. Days are India days; student numbers leave out team accounts.
export interface AdminOverview {
  status: { state: "fine" | "attention" | "down"; failingSince: string | null };
  numbers: {
    solves: number;
    solvesToday: number;
    realStudents: number;
    teamStudents: number;
    activeThisWeek: number;
    failedTries: number;
    failedTries24h: number;
    tries24h: number;
  };
  solvesPerDay: Array<{ day: string; count: number }>;
  aiUsage: {
    ai: number;
    backup: number;
    cache: number;
    instant: number;
    tokensToday: number;
    avgTokensPerSolve: number;
    limit: number | null;
    resetsAt: string;
  };
  needsYou: Array<{ kind: "failed" | "report" | "feedback"; id: string; title: string; subtitle: string; at: string }>;
  funnel: { signedUp: number; verified: number; solved: number; cameBack: number };
  topTopics: Array<{ problemType: string; count: number }>;
}

// The admin Business screen. Team accounts are left out unless asked for.
export interface AdminBusiness {
  numbers: { students: number; activeThisWeek: number; activeRate: number; solvesPerActive: number; limitHits: number };
  newPerDay: Array<{ day: string; count: number }>;
  funnel: { signedUp: number; verified: number; solved: number; cameBack: number };
  // Newest first. weeks[0] is the signup week (always 100), then each week since, up to this one.
  cohorts: Array<{ weekStart: string; students: number; weeks: number[] }>;
  cost: { tokensToday: number; avgTokensPerSolve: number };
  topics: Array<{ problemType: string; count: number }>;
  hiddenTeam: number;
}

// Nav counts. Failed solves count problems, not tries.
export interface AdminCounts {
  failedOpen: number;
  reportsBlocked: number;
  feedbackOpen: number;
}

// Failed solves: one group is one student and one problem, however many tries
export type FailedStatus = "open" | "resolved" | "all";

export interface FailedGroup {
  id: string;
  problem: string;
  tries: number;
  firstAt: string;
  lastAt: string;
  errorCode: string;
  ms: number | null;
  // Null once the student deleted their account
  student: { id: string; name: string } | null;
  workedLater: boolean;
  resolved: boolean;
}

export interface FailedResponse {
  groups: FailedGroup[];
  problems: number;
  tries: number;
}

export interface FailureDetails {
  attempts: Array<{ model: string; error: string }>;
  promptVersion: string;
  fullMessage: string;
}

export interface FailedDetail extends FailedGroup {
  // Oldest first. Details are null for failures saved before they were kept.
  attempts: Array<{ at: string; ms: number | null; errorCode: string; details: FailureDetails | null }>;
}

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

// Report types
// Null when the answer never went into the shared cache (an instant answer)
export type ReportCacheStatus = "blocked" | "shared" | "unchecked" | null;

export interface ReportItem {
  id: string;
  problemText: string | null;
  answerText: string | null;
  reason: string | null;
  cacheStatus: ReportCacheStatus;
  createdAt: string;
}

export interface ReportDetail extends ReportItem {
  checkedByCode: boolean;
  // Null once the student deleted the solution
  solution: {
    steps: Array<{ reason: string; block?: { type: string; latex?: string; text?: string } }>;
    answer: { latex?: string; text?: string };
  } | null;
  solvedAt: string | null;
  student: { id: string; name: string };
}

export interface ReportsResponse {
  reports: ReportItem[];
}

// Feedback types
export interface FeedbackItem {
  id: string;
  kind: "bug" | "idea" | "other";
  message: string;
  page: string | null;
  solutionId: string | null;
  userId: string;
  name: string;
  email: string;
  done: boolean;
  createdAt: string;
}

export interface FeedbackResponse {
  feedback: FeedbackItem[];
}

// One student, for the admin Students screen
export interface StudentDetail {
  id: string;
  name: string;
  email: string;
  provider: string;
  joinedAt: string;
  isAdmin: boolean;
  isTeam: boolean;
  solves: number;
  failed: number;
  reports: number;
  usedToday: number;
  dailyLimit: number;
  // Newest first, at most 20
  history: Array<{ kind: "solved" | "failed" | "reported" | "joined"; title: string; at: string }>;
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

export default adminService;
