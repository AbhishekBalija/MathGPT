import api from "./api";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
  createdAt: string;
}

export interface UserStats {
  totalSolutions: number;
  problemTypes: Record<string, number>;
  lastSolvedAt: string | null;
}

export interface ProfileResponse {
  user: UserProfile;
  stats: UserStats;
}

/**
 * Fetch user profile and statistics
 */
export const getUserProfile = async (): Promise<ProfileResponse> => {
  const response = await api.get<ProfileResponse>("/api/profile");
  return response.data;
};

export default {
  getUserProfile,
};
