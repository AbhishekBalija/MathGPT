/**
 * Saves or skips the Onboarding answer (#39). Both return the updated User,
 * so the caller can put it straight into the auth store.
 */

import api from "./api";
import type { User } from "./auth.service";
import type { ClassAnswer } from "../features/onboarding/class-options";

export const classService = {
  async save(answer: ClassAnswer): Promise<User> {
    const response = await api.put<{ user: User }>("/api/profile/class", answer);
    return response.data.user;
  },

  async skip(): Promise<User> {
    const response = await api.post<{ user: User }>("/api/profile/class/skip");
    return response.data.user;
  },
};
